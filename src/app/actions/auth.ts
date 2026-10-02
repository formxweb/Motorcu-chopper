'use server';

import { redirect } from 'next/navigation';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { passwordResets, sessions, users } from '@/db/schema';
import { createSession, destroySession, hashPassword, normalizeEmail, verifyPassword } from '@/lib/auth';
import { mergeGuestCart } from '@/lib/cart';
import { passwordResetEmail } from '@/lib/emails';
import { appUrl } from '@/lib/env';
import type { FormState } from '@/lib/form-state';
import { sendMail } from '@/lib/mail';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { bool, isValidPhone, normalizePhone, randomToken, safeNext, sha256, str } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkCredentials(email: string, password: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) {
    await verifyPassword(password, '$2a$11$C6UzMDM.H6dfI/f/IKcEeO4yQ0r6XpZ0g7aT8J2bQm2T3QWkYjF5a').catch(() => false);
    return null;
  }
  return (await verifyPassword(password, u.passwordHash)) ? u : null;
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, 'email'));
  const password = str(fd, 'password');
  const next = safeNext(str(fd, 'sonra'), '/hesap');
  if (!email || !password) return { ok: false, message: 'E-posta ve şifreni yaz.', fields: { email } };
  const ip = await clientIp();
  if (!(await rateLimit(`giris:${ip}:${email}`, 8, 900))) {
    return { ok: false, message: 'Çok fazla deneme yaptın. 15 dakika sonra tekrar dene.', fields: { email } };
  }
  const u = await checkCredentials(email, password);
  if (!u) return { ok: false, message: 'E-posta veya şifre hatalı.', fields: { email } };
  await createSession(u.id);
  await mergeGuestCart(u.id);
  redirect(next);
}

export async function adminLogin(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, 'email'));
  const password = str(fd, 'password');
  if (!email || !password) return { ok: false, message: 'E-posta ve şifreni yaz.', fields: { email } };
  const ip = await clientIp();
  if (!(await rateLimit(`yonetim:${ip}`, 10, 900))) {
    return { ok: false, message: 'Çok fazla deneme yaptın. 15 dakika sonra tekrar dene.', fields: { email } };
  }
  const u = await checkCredentials(email, password);
  if (!u || u.role !== 'admin') return { ok: false, message: 'E-posta veya şifre hatalı ya da bu hesabın yönetici yetkisi yok.', fields: { email } };
  await createSession(u.id);
  redirect('/yonetim');
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const firstName = str(fd, 'firstName');
  const lastName = str(fd, 'lastName');
  const email = normalizeEmail(str(fd, 'email'));
  const phone = str(fd, 'phone');
  const password = str(fd, 'password');
  const next = safeNext(str(fd, 'sonra'), '/hesap');
  const fields = { firstName, lastName, email, phone };
  if (!firstName || !lastName) return { ok: false, message: 'Adını ve soyadını yaz.', fields };
  if (!EMAIL_RE.test(email)) return { ok: false, message: 'Geçerli bir e-posta adresi yaz.', fields };
  if (phone && !isValidPhone(phone)) return { ok: false, message: 'Telefon numarasını 05xx xxx xx xx biçiminde yaz.', fields };
  if (password.length < 8) return { ok: false, message: 'Şifre en az 8 karakter olmalı.', fields };
  if (!bool(fd, 'kvkk')) return { ok: false, message: 'Üyelik koşullarını ve aydınlatma metnini onayla.', fields };
  const ip = await clientIp();
  if (!(await rateLimit(`kayit:${ip}`, 10, 3600))) return { ok: false, message: 'Çok fazla deneme yaptın. Bir saat sonra tekrar dene.', fields };

  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) return { ok: false, message: 'Bu e-posta ile bir hesap var. Giriş yap veya şifreni yenile.', fields };
  const [u] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      firstName,
      lastName,
      phone: phone ? normalizePhone(phone) : '',
      marketingConsent: bool(fd, 'pazarlama'),
    })
    .returning({ id: users.id });
  await createSession(u.id);
  await mergeGuestCart(u.id);
  redirect(next);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/');
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = normalizeEmail(str(fd, 'email'));
  const done: FormState = { ok: true, message: 'Bu e-postayla bir hesap varsa şifre yenileme bağlantısı gönderdik. Gelen kutunu ve spam klasörünü kontrol et.' };
  if (!EMAIL_RE.test(email)) return { ok: false, message: 'Geçerli bir e-posta adresi yaz.', fields: { email } };
  const ip = await clientIp();
  if (!(await rateLimit(`sifre:${ip}`, 5, 3600))) return { ok: false, message: 'Çok fazla deneme yaptın. Bir saat sonra tekrar dene.' };
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) return done;
  const token = randomToken(32);
  await db.insert(passwordResets).values({ id: sha256(token), userId: u.id, expiresAt: new Date(Date.now() + 3600 * 1000) });
  const s = await getSettings();
  const link = `${appUrl()}/hesap/sifre-yenile?t=${token}`;
  const m = passwordResetEmail(s, u.firstName, link);
  await sendMail({ to: u.email, subject: m.subject, html: m.html });
  return done;
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 't');
  const password = str(fd, 'password');
  if (password.length < 8) return { ok: false, message: 'Şifre en az 8 karakter olmalı.' };
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.id, sha256(token)), gt(passwordResets.expiresAt, new Date()), isNull(passwordResets.usedAt)))
    .limit(1);
  if (!row) return { ok: false, message: 'Bağlantının süresi dolmuş veya daha önce kullanılmış. Yeni bağlantı iste.' };
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, row.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
  await db.delete(sessions).where(eq(sessions.userId, row.userId));
  await createSession(row.userId);
  redirect('/hesap?sifre=yenilendi');
}
