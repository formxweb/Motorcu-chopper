import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { getCurrentUser } from './auth';
import { safeEqual } from './utils';

/** Sipariş sahibi, bağlantıdaki erişim anahtarı veya yönetici ise siparişi döner. */
export async function accessibleOrder(number: string, token: string | undefined | null) {
  if (!/^[A-Z0-9]{6,20}$/.test(number)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o) return null;
  if (token && safeEqual(token, o.accessToken)) return o;
  const user = await getCurrentUser();
  if (user && (user.role === 'admin' || (o.userId && o.userId === user.id))) return o;
  return null;
}
