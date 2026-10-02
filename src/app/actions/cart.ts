'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { cartItems, carts, products, variants, type Customization } from '@/db/schema';
import { customizationKey, getCart, getOrCreateCartId } from '@/lib/cart';
import { evaluateDiscount } from '@/lib/pricing';
import type { FormState } from '@/lib/form-state';
import { isUuid, str } from '@/lib/utils';

export async function addToCart(_prev: FormState, fd: FormData): Promise<FormState> {
  const variantId = str(fd, 'variantId');
  const qty = Math.max(1, Math.min(20, Number.parseInt(str(fd, 'quantity') || '1', 10) || 1));
  if (!isUuid(variantId)) return { ok: false, message: 'Önce seçenekleri seç.', at: Date.now() };

  const [row] = await db
    .select({ v: variants, p: products })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.id, variantId))
    .limit(1);
  if (!row || !row.v.isActive || !row.p.isActive) return { ok: false, message: 'Bu ürün şu an satışta değil.', at: Date.now() };

  const customization: Customization = {};
  for (const f of row.p.customFields) {
    const v = str(fd, `ozel_${f.key}`).replace(/\s+/g, ' ');
    if (f.required && !v) return { ok: false, message: `${f.label} alanını doldur.`, at: Date.now() };
    if (v.length > f.maxLength) return { ok: false, message: `${f.label} en fazla ${f.maxLength} karakter olabilir.`, at: Date.now() };
    if (v) customization[f.key] = v;
  }
  const key = customizationKey(customization);

  const cartId = await getOrCreateCartId();
  const [existing] = await db
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId), eq(cartItems.customizationKey, key)))
    .limit(1);
  const wanted = (existing?.quantity ?? 0) + qty;
  if (row.p.trackStock && wanted > row.v.stock) {
    return {
      ok: false,
      message: row.v.stock <= 0 ? 'Bu seçenek tükendi.' : `Bu seçenekten stokta ${row.v.stock} adet var${existing ? `, sepetinde ${existing.quantity} adet bulunuyor` : ''}.`,
      at: Date.now(),
    };
  }
  await db
    .insert(cartItems)
    .values({ cartId, variantId, quantity: qty, customization, customizationKey: key })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId, cartItems.customizationKey],
      set: { quantity: sql`least(${cartItems.quantity} + ${qty}, 20)` },
    });
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  revalidatePath('/', 'layout');
  return { ok: true, message: `${row.p.name} sepete eklendi.`, at: Date.now() };
}

async function ownItem(itemId: string): Promise<string | null> {
  if (!isUuid(itemId)) return null;
  const cart = await getCart();
  if (!cart.id) return null;
  return cart.lines.some((l) => l.itemId === itemId) ? cart.id : null;
}

export async function setCartQuantity(itemId: string, quantity: number): Promise<void> {
  const cartId = await ownItem(itemId);
  if (!cartId) return;
  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  } else {
    await db
      .update(cartItems)
      .set({ quantity: Math.min(20, quantity) })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
  revalidatePath('/', 'layout');
}

export async function removeCartItem(itemId: string): Promise<void> {
  await setCartQuantity(itemId, 0);
}

export async function applyDiscount(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, 'code');
  const cart = await getCart();
  if (!cart.id || !cart.lines.length) return { ok: false, message: 'Sepetin boş.' };
  const r = await evaluateDiscount(code, cart.subtotal);
  if (!r.ok) return { ok: false, message: r.error };
  await db.update(carts).set({ discountCode: r.code, updatedAt: new Date() }).where(eq(carts.id, cart.id));
  revalidatePath('/', 'layout');
  return { ok: true, message: `${r.code} uygulandı: ${r.label}.` };
}

export async function removeDiscount(): Promise<void> {
  const cart = await getCart();
  if (!cart.id) return;
  await db.update(carts).set({ discountCode: '' }).where(eq(carts.id, cart.id));
  revalidatePath('/', 'layout');
}
