'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { assertAdmin, hashPassword, normalizeEmail } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { parseTL } from '@/lib/money';
import { getSettings, saveSettings } from '@/lib/settings';
import type { Carrier, StoreSettings } from '@/lib/settings-defaults';
import { bool, int, isUuid, slugify, str } from '@/lib/utils';

export async function saveStoreSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const section = str(fd, 'section');
  const current = await getSettings();
  const patch: Partial<StoreSettings> = {};

  if (section === 'magaza') {
    patch.storeName = str(fd, 'storeName') || current.storeName;
    patch.tagline = str(fd, 'tagline');
    patch.announcement = str(fd, 'announcement');
    patch.storeOpen = bool(fd, 'storeOpen');
    patch.contactEmail = str(fd, 'contactEmail');
    patch.contactPhone = str(fd, 'contactPhone');
    patch.whatsapp = str(fd, 'whatsapp').replace(/\D/g, '');
    patch.instagram = str(fd, 'instagram');
    patch.workingHours = str(fd, 'workingHours');
    patch.notifyEmail = str(fd, 'notifyEmail');
  } else if (section === 'satici') {
    patch.seller = {
      title: str(fd, 'title'),
      address: str(fd, 'address'),
      taxOffice: str(fd, 'taxOffice'),
      taxNumber: str(fd, 'taxNumber'),
      mersis: str(fd, 'mersis'),
      kep: str(fd, 'kep'),
    };
  } else if (section === 'kargo') {
    const fee = parseTL(str(fd, 'shippingFee') || '0');
    const free = parseTL(str(fd, 'freeShippingThreshold') || '0');
    if (fee === null || free === null) return { ok: false, message: 'Kargo ücretini ve ücretsiz kargo sınırını rakamla yaz.', at: Date.now() };
    patch.shippingFee = fee;
    patch.freeShippingThreshold = free;
    patch.shipDays = str(fd, 'shipDays') || current.shipDays;
    patch.personalizedDays = str(fd, 'personalizedDays') || current.personalizedDays;
    patch.returnDays = Math.max(14, int(fd, 'returnDays', 14));
  } else if (section === 'kargo-firmalari') {
    const lines = str(fd, 'carriers')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const carriers: Carrier[] = [];
    for (const l of lines) {
      const [name, url = ''] = l.split('|').map((x) => x.trim());
      if (!name) continue;
      if (url && !/^https?:\/\//.test(url)) return { ok: false, message: `"${name}" için takip adresi http ile başlamalı.`, at: Date.now() };
      carriers.push({ id: slugify(name), name, url });
    }
    if (!carriers.length) return { ok: false, message: 'En az bir kargo firması yaz.', at: Date.now() };
    patch.carriers = carriers;
  } else {
    return { ok: false, message: 'Bilinmeyen bölüm.', at: Date.now() };
  }
  await saveSettings(patch);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ayarlar kaydedildi.', at: Date.now() };
}

export async function addAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const email = normalizeEmail(str(fd, 'email'));
  const password = str(fd, 'password');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Geçerli bir e-posta yaz.', at: Date.now() };
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (u) {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, u.id));
    revalidatePath('/yonetim/ayarlar');
    return { ok: true, message: `${email} artık yönetici. Mevcut şifresiyle giriş yapabilir.`, at: Date.now() };
  }
  if (password.length < 10) return { ok: false, message: 'Yeni yönetici için en az 10 karakterlik şifre yaz.', at: Date.now() };
  await db.insert(users).values({ email, passwordHash: await hashPassword(password), role: 'admin', firstName: str(fd, 'firstName') });
  revalidatePath('/yonetim/ayarlar');
  return { ok: true, message: `${email} yönetici olarak eklendi.`, at: Date.now() };
}

export async function removeAdmin(id: string): Promise<void> {
  const me = await assertAdmin();
  if (!isUuid(id) || id === me.id) return;
  const others = await db.$count(users, and(eq(users.role, 'admin'), ne(users.id, id)));
  if (others < 1) return;
  await db.update(users).set({ role: 'customer' }).where(eq(users.id, id));
  await db.delete(sessions).where(eq(sessions.userId, id));
  revalidatePath('/yonetim/ayarlar');
}
