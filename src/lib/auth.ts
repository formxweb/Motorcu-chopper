import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { sessions, users, type UserRole } from '@/db/schema';
import { isHttps } from './env';
import { randomToken, sha256 } from './utils';

export const SESSION_COOKIE = 'mc_oturum';
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
};

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 11);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Yalnızca Server Action veya Route Handler içinde çağrılır. */
export async function createSession(userId: string): Promise<void> {
  // Aynı tarayıcıda başka bir hesaba geçilirse önceki oturum (ör. yönetici) tamamen kapanır.
  const previous = (await cookies()).get(SESSION_COOKIE)?.value;
  if (previous) await db.delete(sessions).where(eq(sessions.id, sha256(previous)));
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
});

export async function requireUser(next = '/hesap'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/hesap/giris?sonra=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/yonetim/giris');
  return user;
}

/** Server Action içinde yönetici kontrolü (yönlendirmeden hata fırlatır). */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Bu işlem için yönetici girişi gerekiyor.');
  return user;
}
