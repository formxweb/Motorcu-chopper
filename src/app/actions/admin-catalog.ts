'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq, ne, notInArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { categories, discountCodes, productImages, products, reviews, variants } from '@/db/schema';
import { assertAdmin } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { parseTL } from '@/lib/money';
import { syncVariants } from '@/lib/product-editor';
import { bool, int, isUuid, slugify, str } from '@/lib/utils';

const payloadSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Ürün adını yaz.').max(150, 'Ürün adı en fazla 150 karakter olabilir.'),
  slug: z.string().trim().max(90),
  categoryId: z.string(),
  summary: z.string().max(200, 'Kısa açıklama en fazla 200 karakter olabilir.'),
  description: z.string().max(10000),
  details: z.string().max(5000),
  price: z.string(),
  compareAtPrice: z.string(),
  badge: z.string().max(40),
  colorLabel: z.string().max(30),
  sizeLabel: z.string().max(30),
  colors: z
    .array(z.object({ name: z.string().trim().min(1, 'Renk adı boş olamaz.').max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Renk kodu #RRGGBB biçiminde olmalı.') }))
    .max(30),
  sizes: z.array(z.string().trim().min(1, 'Beden adı boş olamaz.').max(30)).max(40),
  customFields: z
    .array(
      z.object({
        key: z.string().max(40),
        label: z.string().trim().min(1, 'Kişiselleştirme alanının adını yaz.').max(60),
        maxLength: z.number().int().min(1).max(200),
        required: z.boolean(),
        placeholder: z.string().max(100),
      }),
    )
    .max(6),
  isPersonalized: z.boolean(),
  trackStock: z.boolean(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
  seoTitle: z.string().max(120),
  seoDescription: z.string().max(300),
  images: z
    .array(z.object({ id: z.string().optional(), url: z.string().min(1).max(500), thumbUrl: z.string().max(500), alt: z.string().max(200), color: z.string().max(40) }))
    .max(30),
  variants: z
    .array(z.object({ color: z.string(), size: z.string(), sku: z.string().max(60), stock: z.number().int().min(-9999).max(99999), price: z.string(), isActive: z.boolean() }))
    .max(600),
});

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(excludeId ? and(eq(products.slug, slug), ne(products.id, excludeId)) : eq(products.slug, slug))
      .limit(1);
    if (!rows.length) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export async function saveProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const fail = (message: string): FormState => ({ ok: false, message, at: Date.now() });
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, 'data'));
  } catch {
    return fail('Form verisi okunamadı.');
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Form verisi geçersiz.');
  const p = parsed.data;

  const price = parseTL(p.price);
  if (price === null || price <= 0) return fail('Satış fiyatını yaz (ör. 3450).');
  const compareAt = p.compareAtPrice.trim() ? parseTL(p.compareAtPrice) : null;
  if (p.compareAtPrice.trim() && (compareAt === null || compareAt <= price)) return fail('İndirim öncesi fiyat, satış fiyatından yüksek olmalı. İndirim yoksa boş bırak.');
  const colorNames = p.colors.map((c) => c.name);
  if (new Set(colorNames).size !== colorNames.length) return fail('Aynı renk adı iki kez yazılmış.');
  if (new Set(p.sizes).size !== p.sizes.length) return fail('Aynı beden iki kez yazılmış.');

  const id = p.id && isUuid(p.id) ? p.id : undefined;
  const slug = await uniqueSlug(slugify(p.slug || p.name), id);
  const usedKeys = new Set<string>();
  const customFields = p.customFields.map((f) => {
    let key = slugify(f.key || f.label).replace(/-/g, '_').slice(0, 30) || 'alan';
    while (usedKeys.has(key)) key = `${key}_2`;
    usedKeys.add(key);
    return { key, label: f.label, maxLength: f.maxLength, required: f.required, placeholder: f.placeholder };
  });
  const values = {
    slug,
    name: p.name,
    categoryId: isUuid(p.categoryId) ? p.categoryId : null,
    summary: p.summary.trim(),
    description: p.description.trim(),
    details: p.details
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
    price,
    compareAtPrice: compareAt,
    badge: p.badge.trim(),
    colorLabel: p.colorLabel.trim() || 'Renk',
    sizeLabel: p.sizeLabel.trim() || 'Beden',
    colors: p.colors,
    sizes: p.sizes,
    customFields,
    isPersonalized: p.isPersonalized || customFields.length > 0,
    trackStock: p.trackStock,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    sortOrder: p.sortOrder,
    seoTitle: p.seoTitle.trim(),
    seoDescription: p.seoDescription.trim(),
    updatedAt: new Date(),
  };

  const variantRows = syncVariants(colorNames, p.sizes, p.variants);
  for (const v of variantRows) {
    if (v.price.trim() && (parseTL(v.price) ?? 0) <= 0) return fail(`"${[v.color, v.size].filter(Boolean).join(' / ')}" için yazılan fiyat geçersiz.`);
  }

  const productId = await db.transaction(async (tx) => {
    let pid = id;
    if (pid) {
      const r = await tx.update(products).set(values).where(eq(products.id, pid)).returning({ id: products.id });
      if (!r.length) throw new Error('Ürün bulunamadı.');
    } else {
      const [r] = await tx.insert(products).values(values).returning({ id: products.id });
      pid = r.id;
    }
    const keep: string[] = [];
    for (const v of variantRows) {
      const [row] = await tx
        .insert(variants)
        .values({
          productId: pid,
          color: v.color,
          size: v.size,
          sku: v.sku.trim(),
          stock: v.stock,
          priceOverride: v.price.trim() ? parseTL(v.price) : null,
          isActive: v.isActive,
        })
        .onConflictDoUpdate({
          target: [variants.productId, variants.color, variants.size],
          set: { sku: v.sku.trim(), stock: v.stock, priceOverride: v.price.trim() ? parseTL(v.price) : null, isActive: v.isActive },
        })
        .returning({ id: variants.id });
      keep.push(row.id);
    }
    await tx.delete(variants).where(keep.length ? and(eq(variants.productId, pid), notInArray(variants.id, keep)) : eq(variants.productId, pid));

    const keepImages = p.images.map((i) => i.id).filter((x): x is string => !!x && isUuid(x));
    await tx
      .delete(productImages)
      .where(keepImages.length ? and(eq(productImages.productId, pid), notInArray(productImages.id, keepImages)) : eq(productImages.productId, pid));
    for (const [idx, img] of p.images.entries()) {
      const color = colorNames.includes(img.color) ? img.color : '';
      if (img.id && isUuid(img.id)) {
        await tx
          .update(productImages)
          .set({ sortOrder: idx, alt: img.alt, color })
          .where(and(eq(productImages.id, img.id), eq(productImages.productId, pid)));
      } else {
        await tx.insert(productImages).values({ productId: pid, url: img.url, thumbUrl: img.thumbUrl || img.url, alt: img.alt, color, sortOrder: idx });
      }
    }
    return pid;
  });

  const savedImages = await db
    .select({ id: productImages.id, url: productImages.url, thumbUrl: productImages.thumbUrl, alt: productImages.alt, color: productImages.color })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Ürün kaydedildi.', at: Date.now(), fields: { id: productId, slug, images: JSON.stringify(savedImages) } };
}

export async function deleteProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const id = str(fd, 'id');
  if (!isUuid(id)) return { ok: false, message: 'Ürün bulunamadı.' };
  if (!bool(fd, 'onay')) return { ok: false, message: 'Silmek için "Eminim" kutusunu işaretle.', at: Date.now() };
  await db.delete(products).where(eq(products.id, id));
  revalidatePath('/', 'layout');
  redirect('/yonetim/urunler');
}

export async function toggleProductActive(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  const [p] = await db.select({ isActive: products.isActive }).from(products).where(eq(products.id, id)).limit(1);
  if (!p) return;
  await db.update(products).set({ isActive: !p.isActive, updatedAt: new Date() }).where(eq(products.id, id));
  revalidatePath('/', 'layout');
}

/* ---------- kategoriler ---------- */

export async function saveCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const id = str(fd, 'id');
  const name = str(fd, 'name');
  if (name.length < 2) return { ok: false, message: 'Kategori adını yaz.', at: Date.now() };
  const slug = slugify(str(fd, 'slug') || name);
  const [clash] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(isUuid(id) ? and(eq(categories.slug, slug), ne(categories.id, id)) : eq(categories.slug, slug))
    .limit(1);
  if (clash) return { ok: false, message: `"${slug}" adresi başka bir kategoride kullanılıyor.`, at: Date.now() };
  const values = { name, slug, description: str(fd, 'description'), sortOrder: int(fd, 'sortOrder'), isActive: bool(fd, 'isActive') };
  if (isUuid(id)) await db.update(categories).set(values).where(eq(categories.id, id));
  else await db.insert(categories).values(values);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Kategori kaydedildi.', at: Date.now() };
}

export async function deleteCategory(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath('/', 'layout');
}

/* ---------- indirim kodları ---------- */

function dateOrNull(v: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return new Date(`${v}T${endOfDay ? '23:59:59' : '00:00:00'}+03:00`);
}

export async function saveCoupon(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertAdmin();
  const code = str(fd, 'code').toLocaleUpperCase('tr-TR').replace(/\s+/g, '');
  const type = str(fd, 'type') === 'fixed' ? 'fixed' : 'percent';
  if (!/^[A-Z0-9ÇĞİÖŞÜ_-]{3,30}$/.test(code)) return { ok: false, message: 'Kod 3-30 karakter olmalı; harf, rakam, - ve _ kullanılabilir.', at: Date.now() };
  let value: number;
  if (type === 'percent') {
    value = int(fd, 'value');
    if (value < 1 || value > 90) return { ok: false, message: 'Yüzde indirim 1 ile 90 arasında olmalı.', at: Date.now() };
  } else {
    const v = parseTL(str(fd, 'value'));
    if (!v || v <= 0) return { ok: false, message: 'İndirim tutarını yaz.', at: Date.now() };
    value = v;
  }
  const minSubtotal = str(fd, 'minSubtotal') ? parseTL(str(fd, 'minSubtotal')) ?? 0 : 0;
  const maxUsesRaw = str(fd, 'maxUses');
  const maxUses = maxUsesRaw ? Math.max(1, Number.parseInt(maxUsesRaw, 10) || 1) : null;
  const [exists] = await db.select({ id: discountCodes.id }).from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  if (exists) return { ok: false, message: 'Bu kod zaten var.', at: Date.now() };
  await db.insert(discountCodes).values({
    code,
    type,
    value,
    minSubtotal,
    maxUses,
    startsAt: dateOrNull(str(fd, 'startsAt')),
    endsAt: dateOrNull(str(fd, 'endsAt'), true),
    isActive: true,
  });
  revalidatePath('/yonetim/kuponlar');
  return { ok: true, message: `${code} oluşturuldu.`, at: Date.now() };
}

export async function toggleCoupon(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  const [c] = await db.select({ isActive: discountCodes.isActive }).from(discountCodes).where(eq(discountCodes.id, id)).limit(1);
  if (!c) return;
  await db.update(discountCodes).set({ isActive: !c.isActive }).where(eq(discountCodes.id, id));
  revalidatePath('/yonetim/kuponlar');
}

export async function deleteCoupon(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await db.delete(discountCodes).where(eq(discountCodes.id, id));
  revalidatePath('/yonetim/kuponlar');
}

/* ---------- yorumlar ---------- */

export async function setReviewStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
  revalidatePath('/yonetim/yorumlar');
  revalidatePath('/', 'layout');
}

export async function deleteReview(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await db.delete(reviews).where(eq(reviews.id, id));
  revalidatePath('/yonetim/yorumlar');
  revalidatePath('/', 'layout');
}
