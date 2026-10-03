import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { db } from '@/db';
import { categories } from '@/db/schema';
import type { EditorPayload } from '@/lib/product-editor';
import { requireAdmin } from '@/lib/auth';

export default async function NewProductPage() {
  await requireAdmin();
  const cats = await db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder));
  const initial: EditorPayload = {
    name: '',
    slug: '',
    categoryId: cats[0]?.id ?? '',
    summary: '',
    description: '',
    details: '',
    price: '',
    compareAtPrice: '',
    badge: '',
    colorLabel: 'Renk',
    sizeLabel: 'Beden',
    colors: [],
    sizes: [],
    customFields: [],
    isPersonalized: false,
    trackStock: true,
    isActive: true,
    isFeatured: false,
    sortOrder: 100,
    seoTitle: '',
    seoDescription: '',
    images: [],
    variants: [{ color: '', size: '', sku: '', stock: 0, price: '', isActive: true }],
  };
  return (
    <>
      <div className="adm-top">
        <div>
          <p className="muted small">
            <Link href="/yonetim/urunler">Ürünler</Link> / Yeni
          </p>
          <h1>Yeni ürün</h1>
        </div>
      </div>
      <ProductEditor initial={initial} categories={cats} />
    </>
  );
}
