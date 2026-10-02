'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import { addresses, favorites, orderItems, orders, products, reviews, users, type OrderStatus } from '@/db/schema';
import { getCurrentUser, hashPassword, requireUser, verifyPassword } from '@/lib/auth';
import { CITIES } from '@/lib/cities';
import type { FormState } from '@/lib/form-state';
import { accessibleOrder } from '@/lib/order-access';
import { customerRequest } from '@/lib/orders';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { bool, isUuid, isValidPhone, normalizePhone, str } from '@/lib/utils';

const REVIEWABLE: OrderStatus[] = ['delivered', 'return_requested', 'refunded'];

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser('/hesap/bilgiler');
  const firstName = str(fd, 'firstName');
  const lastName = str(fd, 'lastName');
  const phone = str(fd, 'phone');
  if (!firstName || !lastName) return { ok: false, message: 'Adını ve soyadını yaz.' };
  if (phone && !isValidPhone(phone)) return { ok: false, message: 'Telefon numarasını 05xx xxx xx xx biçiminde yaz.' };
  await db
    .update(users)
    .set({ firstName, lastName, phone: phone ? normalizePhone(phone) : '', marketingConsent: bool(fd, 'pazarlama') })
    .where(eq(users.id, user.id));
  revalidatePath('/hesap', 'layout');
  return { ok: true, message: 'Bilgilerin kaydedildi.', at: Date.now() };
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser('/hesap/bilgiler');
  const current = str(fd, 'current');
  const next = str(fd, 'next');
  if (next.length < 8) return { ok: false, message: 'Yeni şifre en az 8 karakter olmalı.' };
  const [u] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!u || !(await verifyPassword(current, u.passwordHash))) return { ok: false, message: 'Mevcut şifren hatalı.' };
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, user.id));
  return { ok: true, message: 'Şifren değiştirildi.', at: Date.now() };
}

export async function saveAddress(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser('/hesap/adresler');
  const id = str(fd, 'id');
  const a = {
    title: str(fd, 'title') || 'Adresim',
    firstName: str(fd, 'firstName'),
    lastName: str(fd, 'lastName'),
    phone: normalizePhone(str(fd, 'phone')),
    city: str(fd, 'city'),
    district: str(fd, 'district'),
    line: str(fd, 'line'),
    zip: str(fd, 'zip'),
  };
  if (!a.firstName || !a.lastName) return { ok: false, message: 'Ad ve soyadı yaz.' };
  if (!isValidPhone(a.phone)) return { ok: false, message: 'Telefonu 05xx xxx xx xx biçiminde yaz.' };
  if (!CITIES.includes(a.city)) return { ok: false, message: 'İl seç.' };
  if (!a.district) return { ok: false, message: 'İlçeyi yaz.' };
  if (a.line.length < 10) return { ok: false, message: 'Mahalle, sokak ve kapı numarasıyla açık adresi yaz.' };
  if (isUuid(id)) {
    await db.update(addresses).set(a).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  } else {
    const count = await db.$count(addresses, eq(addresses.userId, user.id));
    await db.insert(addresses).values({ ...a, userId: user.id, isDefault: count === 0 });
  }
  revalidatePath('/hesap/adresler');
  return { ok: true, message: 'Adres kaydedildi.', at: Date.now() };
}

export async function deleteAddress(id: string): Promise<void> {
  const user = await requireUser('/hesap/adresler');
  if (!isUuid(id)) return;
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath('/hesap/adresler');
}

export async function setDefaultAddress(id: string): Promise<void> {
  const user = await requireUser('/hesap/adresler');
  if (!isUuid(id)) return;
  await db.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, user.id), ne(addresses.id, id)));
  await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath('/hesap/adresler');
}

export async function toggleFavorite(productId: string, slug: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect(`/hesap/giris?sonra=${encodeURIComponent(`/urun/${slug}`)}`);
  if (!isUuid(productId)) return;
  const [existing] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.productId, productId)))
    .limit(1);
  if (existing) await db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.productId, productId)));
  else await db.insert(favorites).values({ userId: user.id, productId }).onConflictDoNothing();
  revalidatePath(`/urun/${slug}`);
  revalidatePath('/hesap/favoriler');
}

export async function orderRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const number = str(fd, 'number');
  const token = str(fd, 't');
  const kind = str(fd, 'kind') === 'return' ? 'return' : 'cancel';
  const note = str(fd, 'note').slice(0, 500);
  const ip = await clientIp();
  if (!(await rateLimit(`talep:${ip}`, 10, 3600))) return { ok: false, message: 'Çok fazla deneme yaptın, biraz sonra tekrar dene.' };
  const o = await accessibleOrder(number, token);
  if (!o) return { ok: false, message: 'Sipariş bulunamadı.' };
  if (kind === 'return' && note.length < 5) return { ok: false, message: 'İade sebebini kısaca yaz (ör. beden büyük geldi, değişim istiyorum).' };
  const r = await customerRequest(o.id, kind, note);
  revalidatePath(`/siparis/${number}`);
  return { ok: r.ok, message: r.message, at: Date.now() };
}

export async function submitReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const productId = str(fd, 'productId');
  const slug = str(fd, 'slug');
  const rating = Number.parseInt(str(fd, 'rating'), 10);
  const body = str(fd, 'body');
  if (!isUuid(productId)) return { ok: false, message: 'Ürün bulunamadı.' };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, message: 'Puan seç.' };
  if (body.length < 10) return { ok: false, message: 'Yorumun en az 10 karakter olmalı.' };
  const bought = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, user.id), eq(orderItems.productId, productId), inArray(orders.status, REVIEWABLE)))
    .limit(1);
  if (!bought.length) return { ok: false, message: 'Yalnızca teslim aldığın ürünlere yorum yazabilirsin.' };
  const [p] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!p) return { ok: false, message: 'Ürün bulunamadı.' };
  const authorName = `${user.firstName} ${user.lastName.slice(0, 1)}.`.trim();
  await db
    .insert(reviews)
    .values({ productId, userId: user.id, rating, body: body.slice(0, 2000), authorName, status: 'pending' })
    .onConflictDoUpdate({ target: [reviews.productId, reviews.userId], set: { rating, body: body.slice(0, 2000), status: 'pending', createdAt: new Date() } });
  revalidatePath(`/urun/${slug}`);
  return { ok: true, message: 'Yorumun alındı. İncelendikten sonra yayınlanacak.', at: Date.now() };
}
