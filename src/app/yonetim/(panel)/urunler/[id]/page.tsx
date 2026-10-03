import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { db } from '@/db';
import { categories, productImages, products, variants } from '@/db/schema';
import { kurusToInput } from '@/lib/money';
import { syncVariants, type EditorPayload } from '@/lib/product-editor';
import { isUuid } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth';

type Params = Promise<{ id: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function EditProductPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) notFound();
  const [imgs, vars, cats] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder), asc(productImages.createdAt)),
    db.select().from(variants).where(eq(variants.productId, id)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  const editorVariants = vars.map((v) => ({
    color: v.color,
    size: v.size,
    sku: v.sku,
    stock: v.stock,
    price: v.priceOverride ? kurusToInput(v.priceOverride) : '',
    isActive: v.isActive,
  }));
  const initial: EditorPayload = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId ?? '',
    summary: p.summary,
    description: p.description,
    details: p.details.join('\n'),
    price: kurusToInput(p.price),
    compareAtPrice: kurusToInput(p.compareAtPrice),
    badge: p.badge,
    colorLabel: p.colorLabel,
    sizeLabel: p.sizeLabel,
    colors: p.colors,
    sizes: p.sizes,
    customFields: p.customFields.map((f) => ({ ...f, placeholder: f.placeholder ?? '' })),
    isPersonalized: p.isPersonalized,
    trackStock: p.trackStock,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    sortOrder: p.sortOrder,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    images: imgs.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl, alt: i.alt, color: i.color })),
    variants: syncVariants(
      p.colors.map((c) => c.name),
      p.sizes,
      editorVariants,
    ),
  };
  return (
    <>
      <div className="adm-top">
        <div>
          <p className="muted small">
            <Link href="/yonetim/urunler">Ürünler</Link> / {p.name}
          </p>
          <h1>{p.name}</h1>
        </div>
      </div>
      {sp.kaydedildi ? <p className="msg msg-ok">Ürün oluşturuldu.</p> : null}
      <ProductEditor initial={initial} categories={cats} />
    </>
  );
}
