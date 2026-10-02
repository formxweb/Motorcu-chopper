'use server';

import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import type { FormState } from '@/lib/form-state';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { str } from '@/lib/utils';

export async function lookupOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  const number = str(fd, 'number').toUpperCase().replace(/\s+/g, '');
  const email = str(fd, 'email').toLowerCase();
  const fields = { number, email };
  if (!number || !email) return { ok: false, message: 'Sipariş numaranı ve e-posta adresini yaz.', fields };
  const ip = await clientIp();
  if (!(await rateLimit(`takip:${ip}`, 20, 900))) return { ok: false, message: 'Çok fazla deneme yaptın. 15 dakika sonra tekrar dene.', fields };
  const [o] = await db
    .select({ number: orders.number, accessToken: orders.accessToken })
    .from(orders)
    .where(and(eq(orders.number, number), eq(orders.email, email)))
    .limit(1);
  if (!o) return { ok: false, message: 'Bu numara ve e-postayla eşleşen sipariş bulunamadı. Sipariş numarası e-postandaki "MC" ile başlayan koddur.', fields };
  redirect(`/siparis/${o.number}?t=${o.accessToken}`);
}
