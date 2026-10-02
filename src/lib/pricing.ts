import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { discountCodes } from '@/db/schema';
import { formatTL } from './money';
import type { StoreSettings } from './settings-defaults';

export type Totals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  freeShippingRemaining: number;
};

export function computeTotals(subtotal: number, discount: number, s: StoreSettings): Totals {
  const d = Math.max(0, Math.min(discount, subtotal - 100));
  const after = subtotal - d;
  const free = s.freeShippingThreshold > 0 && after >= s.freeShippingThreshold;
  const shipping = subtotal === 0 || free ? 0 : Math.max(0, s.shippingFee);
  return {
    subtotal,
    discountTotal: subtotal > 0 ? d : 0,
    shippingTotal: shipping,
    total: after + shipping,
    freeShippingRemaining: s.freeShippingThreshold > 0 && subtotal > 0 ? Math.max(0, s.freeShippingThreshold - after) : 0,
  };
}

export type DiscountResult =
  | { ok: true; code: string; amount: number; label: string }
  | { ok: false; error: string };

export async function evaluateDiscount(rawCode: string, subtotal: number): Promise<DiscountResult> {
  const code = rawCode.trim().toLocaleUpperCase('tr-TR');
  if (!code) return { ok: false, error: 'İndirim kodunu yaz.' };
  const [row] = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  const now = new Date();
  if (!row || !row.isActive) return { ok: false, error: 'Bu indirim kodu geçerli değil.' };
  if (row.startsAt && row.startsAt > now) return { ok: false, error: 'Bu indirim kodu henüz başlamadı.' };
  if (row.endsAt && row.endsAt < now) return { ok: false, error: 'Bu indirim kodunun süresi doldu.' };
  if (row.maxUses !== null && row.usedCount >= row.maxUses) return { ok: false, error: 'Bu indirim kodunun kullanım hakkı doldu.' };
  if (subtotal < row.minSubtotal)
    return { ok: false, error: `Bu kod ${formatTL(row.minSubtotal)} ve üzeri alışverişte geçerli.` };
  const amount = row.type === 'percent' ? Math.round((subtotal * Math.min(row.value, 90)) / 100) : Math.min(row.value, subtotal - 100);
  const label = row.type === 'percent' ? `%${row.value} indirim` : `${formatTL(row.value)} indirim`;
  return { ok: true, code: row.code, amount: Math.max(0, amount), label };
}

/**
 * İndirimi satırlara orantılı dağıtır. Dönen tutarların toplamı (subtotal - discount)'a eşittir
 * ve her satır en az 1 kuruştur (iyzico sepet kalemi kuralı).
 */
export function allocateDiscount(lineTotals: number[], discount: number): number[] {
  const subtotal = lineTotals.reduce((a, b) => a + b, 0);
  if (discount <= 0 || subtotal <= 0) return [...lineTotals];
  const shares = lineTotals.map((t) => Math.floor((discount * t) / subtotal));
  let remainder = discount - shares.reduce((a, b) => a + b, 0);
  const out = lineTotals.map((t, i) => t - shares[i]);
  const order = out.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
  let k = 0;
  while (remainder > 0 && k < order.length * 4) {
    const idx = order[k % order.length][1];
    if (out[idx] > 1) {
      out[idx] -= 1;
      remainder -= 1;
    }
    k += 1;
  }
  return out;
}
