import { cookies } from 'next/headers';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  cartItems,
  carts,
  categories,
  productImages,
  products,
  variants,
  type Customization,
  type CustomizationLine,
  type CustomField,
} from '@/db/schema';
import { getCurrentUser } from './auth';
import { isHttps } from './env';
import { isUuid } from './utils';

export const CART_COOKIE = 'mc_sepet';

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  color: string;
  size: string;
  colorLabel: string;
  sizeLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  stock: number;
  trackStock: boolean;
  isPersonalized: boolean;
  categoryName: string;
  customization: Customization;
  customLines: CustomizationLine[];
  imageUrl: string;
  thumbUrl: string;
  problem: string;
};

export type CartView = {
  id: string | null;
  lines: CartLine[];
  discountCode: string;
  count: number;
  subtotal: number;
  hasProblems: boolean;
};

async function findCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const rows = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, user.id))
      .orderBy(desc(carts.updatedAt))
      .limit(1);
    return rows[0]?.id ?? null;
  }
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!isUuid(token)) return null;
  const rows = await db
    .select({ id: carts.id })
    .from(carts)
    .where(and(eq(carts.id, token), isNull(carts.userId)))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Yalnızca Server Action içinde: sepet yoksa oluşturur, misafir için çerez yazar. */
export async function getOrCreateCartId(): Promise<string> {
  const existing = await findCartId();
  if (existing) return existing;
  const user = await getCurrentUser();
  const [row] = await db.insert(carts).values({ userId: user?.id ?? null }).returning({ id: carts.id });
  if (!user) {
    const store = await cookies();
    store.set(CART_COOKIE, row.id, {
      httpOnly: true,
      secure: isHttps(),
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 60,
    });
  }
  return row.id;
}

export function customizationKey(c: Customization): string {
  const entries = Object.entries(c)
    .filter(([, v]) => v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? JSON.stringify(entries) : '';
}

export function customLinesFor(fields: CustomField[], c: Customization): CustomizationLine[] {
  return fields.map((f) => ({ label: f.label, value: c[f.key] ?? '' })).filter((l) => l.value !== '');
}

/** Ürün başına renk eşleşen ilk görseli seçer. */
export async function imagesByProduct(productIds: string[]) {
  if (!productIds.length) return new Map<string, { url: string; thumbUrl: string; color: string }[]>();
  const rows = await db
    .select({ productId: productImages.productId, url: productImages.url, thumbUrl: productImages.thumbUrl, color: productImages.color })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));
  const map = new Map<string, { url: string; thumbUrl: string; color: string }[]>();
  for (const r of rows) {
    const list = map.get(r.productId) ?? [];
    list.push(r);
    map.set(r.productId, list);
  }
  return map;
}

export function pickImage(list: { url: string; thumbUrl: string; color: string }[] | undefined, color: string) {
  if (!list || !list.length) return { url: '', thumbUrl: '' };
  return list.find((i) => color && i.color === color) ?? list.find((i) => !i.color) ?? list[0];
}

export async function loadCartLines(cartId: string): Promise<CartLine[]> {
  const rows = await db
    .select({
      itemId: cartItems.id,
      quantity: cartItems.quantity,
      customization: cartItems.customization,
      variantId: variants.id,
      color: variants.color,
      size: variants.size,
      sku: variants.sku,
      stock: variants.stock,
      priceOverride: variants.priceOverride,
      variantActive: variants.isActive,
      productId: products.id,
      slug: products.slug,
      name: products.name,
      price: products.price,
      productActive: products.isActive,
      trackStock: products.trackStock,
      isPersonalized: products.isPersonalized,
      customFields: products.customFields,
      colorLabel: products.colorLabel,
      sizeLabel: products.sizeLabel,
      categoryName: categories.name,
    })
    .from(cartItems)
    .innerJoin(variants, eq(variants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, variants.productId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.createdAt));

  const imgs = await imagesByProduct([...new Set(rows.map((r) => r.productId))]);

  return rows.map((r) => {
    const unitPrice = r.priceOverride ?? r.price;
    let problem = '';
    if (!r.productActive || !r.variantActive) problem = 'Bu ürün artık satışta değil.';
    else if (r.trackStock && r.stock <= 0) problem = 'Tükendi.';
    else if (r.trackStock && r.quantity > r.stock) problem = `Stokta ${r.stock} adet kaldı.`;
    const img = pickImage(imgs.get(r.productId), r.color);
    return {
      itemId: r.itemId,
      variantId: r.variantId,
      productId: r.productId,
      slug: r.slug,
      name: r.name,
      color: r.color,
      size: r.size,
      colorLabel: r.colorLabel,
      sizeLabel: r.sizeLabel,
      sku: r.sku,
      quantity: r.quantity,
      unitPrice,
      lineTotal: unitPrice * r.quantity,
      stock: r.stock,
      trackStock: r.trackStock,
      isPersonalized: r.isPersonalized,
      categoryName: r.categoryName ?? '',
      customization: r.customization ?? {},
      customLines: customLinesFor(r.customFields ?? [], r.customization ?? {}),
      imageUrl: img.url,
      thumbUrl: img.thumbUrl,
      problem,
    };
  });
}

export async function getCart(): Promise<CartView> {
  const id = await findCartId();
  if (!id) return { id: null, lines: [], discountCode: '', count: 0, subtotal: 0, hasProblems: false };
  const [cart] = await db.select({ discountCode: carts.discountCode }).from(carts).where(eq(carts.id, id)).limit(1);
  const lines = await loadCartLines(id);
  return {
    id,
    lines,
    discountCode: cart?.discountCode ?? '',
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    hasProblems: lines.some((l) => l.problem !== ''),
  };
}

export async function getCartCount(): Promise<number> {
  const id = await findCartId();
  if (!id) return 0;
  const rows = await db
    .select({ n: sql<number>`coalesce(sum(${cartItems.quantity}), 0)`.mapWith(Number) })
    .from(cartItems)
    .where(eq(cartItems.cartId, id));
  return rows[0]?.n ?? 0;
}

/** Girişten sonra misafir sepetini kullanıcının sepetine taşır. */
export async function mergeGuestCart(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!isUuid(token)) return;
  const [guest] = await db
    .select({ id: carts.id, discountCode: carts.discountCode })
    .from(carts)
    .where(and(eq(carts.id, token), isNull(carts.userId)))
    .limit(1);
  if (!guest) return;
  const [own] = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .orderBy(desc(carts.updatedAt))
    .limit(1);
  if (!own) {
    await db.update(carts).set({ userId, updatedAt: new Date() }).where(eq(carts.id, guest.id));
    return;
  }
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
  for (const it of items) {
    await db
      .insert(cartItems)
      .values({
        cartId: own.id,
        variantId: it.variantId,
        quantity: it.quantity,
        customization: it.customization,
        customizationKey: it.customizationKey,
      })
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId, cartItems.customizationKey],
        set: { quantity: sql`${cartItems.quantity} + ${it.quantity}` },
      });
  }
  if (guest.discountCode) await db.update(carts).set({ discountCode: guest.discountCode }).where(eq(carts.id, own.id));
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, own.id));
  await db.delete(carts).where(eq(carts.id, guest.id));
  store.delete(CART_COOKIE);
}
