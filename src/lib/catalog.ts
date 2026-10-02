import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { categories, productImages, products, reviews, variants, type ColorOption } from '@/db/schema';
import { imagesByProduct, pickImage } from './cart';

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  price: number;
  compareAtPrice: number | null;
  badge: string;
  imageUrl: string;
  thumbUrl: string;
  altThumbUrl: string;
  colors: ColorOption[];
  soldOut: boolean;
  isPersonalized: boolean;
};

export type ListParams = {
  category?: string;
  color?: string;
  size?: string;
  q?: string;
  sort?: string;
  page?: number;
  featuredOnly?: boolean;
  personalizedOnly?: boolean;
  limit?: number;
  excludeId?: string;
  categoryId?: string;
};

export const PAGE_SIZE = 24;

async function stockByProduct(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await db
    .select({ productId: variants.productId, stock: sql<number>`coalesce(sum(${variants.stock}) filter (where ${variants.isActive}), 0)`.mapWith(Number) })
    .from(variants)
    .where(inArray(variants.productId, ids))
    .groupBy(variants.productId);
  return new Map(rows.map((r) => [r.productId, r.stock]));
}

function cardsFrom(
  rows: (typeof products.$inferSelect)[],
  imgs: Awaited<ReturnType<typeof imagesByProduct>>,
  stock: Map<string, number>,
): ProductCard[] {
  return rows.map((p) => {
    const list = imgs.get(p.id) ?? [];
    const first = pickImage(list, p.colors[0]?.name ?? '');
    const second = list.find((i) => i.url !== first.url && (!i.color || i.color === (p.colors[0]?.name ?? '')));
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      badge: p.badge,
      imageUrl: first.url,
      thumbUrl: first.thumbUrl || first.url,
      altThumbUrl: second?.thumbUrl ?? '',
      colors: p.colors,
      soldOut: p.trackStock && (stock.get(p.id) ?? 0) <= 0,
      isPersonalized: p.isPersonalized,
    };
  });
}

export async function listProducts(params: ListParams): Promise<{ items: ProductCard[]; total: number }> {
  const conds: SQL[] = [eq(products.isActive, true)];
  if (params.category) conds.push(eq(categories.slug, params.category));
  if (params.categoryId) conds.push(eq(products.categoryId, params.categoryId));
  if (params.excludeId) conds.push(sql`${products.id} <> ${params.excludeId}`);
  if (params.featuredOnly) conds.push(eq(products.isFeatured, true));
  if (params.personalizedOnly) conds.push(eq(products.isPersonalized, true));
  if (params.q) {
    const like = `%${params.q.replace(/[%_]/g, '')}%`;
    const c = or(ilike(products.name, like), ilike(products.summary, like), ilike(products.description, like));
    if (c) conds.push(c);
  }
  if (params.color) {
    conds.push(sql`exists (select 1 from variants v where v.product_id = products.id and v.color = ${params.color} and v.is_active)`);
  }
  if (params.size) {
    conds.push(sql`exists (select 1 from variants v where v.product_id = products.id and v.size = ${params.size} and v.is_active)`);
  }
  const where = and(...conds);
  const order =
    params.sort === 'artan'
      ? [asc(products.price)]
      : params.sort === 'azalan'
        ? [desc(products.price)]
        : params.sort === 'yeni'
          ? [desc(products.createdAt)]
          : [asc(products.sortOrder), desc(products.createdAt)];
  const limit = params.limit ?? PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);

  const rows = await db
    .select({ p: products })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(...order)
    .limit(limit)
    .offset((page - 1) * limit);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where);

  const list = rows.map((r) => r.p);
  const ids = list.map((p) => p.id);
  const [imgs, stock] = await Promise.all([imagesByProduct(ids), stockByProduct(ids)]);
  return { items: cardsFrom(list, imgs, stock), total: n };
}

export async function activeCategories() {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      count: sql<number>`(select count(*) from products p where p.category_id = categories.id and p.is_active)`.mapWith(Number),
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  return rows;
}

export async function filterOptions() {
  const rows = await db
    .selectDistinct({ color: variants.color, size: variants.size })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(eq(products.isActive, true), eq(variants.isActive, true)));
  const colors = [...new Set(rows.map((r) => r.color).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
  const sizes = [...new Set(rows.map((r) => r.size).filter(Boolean))].sort((a, b) => {
    const ia = sizeOrder.indexOf(a);
    const ib = sizeOrder.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'tr');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return { colors, sizes };
}

export async function getProduct(slug: string, includeInactive = false) {
  const [row] = await db
    .select({ p: products, categoryName: categories.name, categorySlug: categories.slug })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(includeInactive ? eq(products.slug, slug) : and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  if (!row) return null;
  const [images, vars, rating] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, row.p.id)).orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
    db.select().from(variants).where(eq(variants.productId, row.p.id)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`.mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(reviews)
      .where(and(eq(reviews.productId, row.p.id), eq(reviews.status, 'approved'))),
  ]);
  return {
    product: row.p,
    categoryName: row.categoryName ?? '',
    categorySlug: row.categorySlug ?? '',
    images,
    variants: vars,
    rating: { avg: rating[0]?.avg ?? 0, count: rating[0]?.count ?? 0 },
  };
}

export async function approvedReviews(productId: string) {
  return db
    .select({ id: reviews.id, rating: reviews.rating, body: reviews.body, authorName: reviews.authorName, createdAt: reviews.createdAt })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
    .orderBy(desc(reviews.createdAt))
    .limit(50);
}

export async function productCardsByIds(ids: string[]): Promise<ProductCard[]> {
  if (!ids.length) return [];
  const list = await db.select().from(products).where(and(inArray(products.id, ids), eq(products.isActive, true)));
  const [imgs, stock] = await Promise.all([imagesByProduct(list.map((p) => p.id)), stockByProduct(list.map((p) => p.id))]);
  const cards = cardsFrom(list, imgs, stock);
  return ids.map((id) => cards.find((c) => c.id === id)).filter((c): c is ProductCard => !!c);
}
