import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { categories, products } from '@/db/schema';
import { appUrl } from '@/lib/env';
import { INFO_PAGES } from '@/lib/legal';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const s = await getSettings();
  if (!s.storeOpen) return [{ url: `${base}/` }];
  const [prods, cats] = await Promise.all([
    db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.isActive, true)),
    db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)),
  ]);
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/urunler`, changeFrequency: 'daily', priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/urunler?kategori=${c.slug}`, priority: 0.8 })),
    ...prods.map((p) => ({ url: `${base}/urun/${p.slug}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...INFO_PAGES.map((p) => ({ url: `${base}/sayfa/${p.slug}`, priority: 0.3 })),
    { url: `${base}/beden-tablosu`, priority: 0.4 },
  ];
}
