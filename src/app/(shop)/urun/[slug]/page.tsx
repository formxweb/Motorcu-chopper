import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq, inArray } from 'drizzle-orm';
import { toggleFavorite } from '@/app/actions/account';
import { IconHeart, IconStar } from '@/components/icons';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductView } from '@/components/shop/ProductView';
import { ReviewForm } from '@/components/shop/ReviewForm';
import { db } from '@/db';
import { favorites, orderItems, orders, reviews, type OrderStatus } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { approvedReviews, getProduct, listProducts } from '@/lib/catalog';
import { appUrl } from '@/lib/env';
import { formatDate } from '@/lib/format';
import { getSettings } from '@/lib/settings';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) return { title: 'Ürün bulunamadı' };
  const p = data.product;
  const img = data.images[0]?.url;
  return {
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.summary || p.description.slice(0, 155),
    alternates: { canonical: `/urun/${p.slug}` },
    openGraph: { title: p.name, description: p.summary, images: img ? [img] : undefined },
  };
}

const DONE: OrderStatus[] = ['delivered', 'return_requested', 'refunded'];

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const data = await getProduct(slug, user?.role === 'admin');
  if (!data) notFound();
  const p = data.product;
  const settings = await getSettings();

  const [fav, revs, related, bought, myReview] = await Promise.all([
    user
      ? db
          .select()
          .from(favorites)
          .where(and(eq(favorites.userId, user.id), eq(favorites.productId, p.id)))
          .limit(1)
      : Promise.resolve([]),
    approvedReviews(p.id),
    p.categoryId ? listProducts({ categoryId: p.categoryId, excludeId: p.id, limit: 4 }) : Promise.resolve({ items: [], total: 0 }),
    user
      ? db
          .select({ id: orderItems.id })
          .from(orderItems)
          .innerJoin(orders, eq(orders.id, orderItems.orderId))
          .where(and(eq(orders.userId, user.id), eq(orderItems.productId, p.id), inArray(orders.status, DONE)))
          .limit(1)
      : Promise.resolve([]),
    user
      ? db
          .select({ status: reviews.status })
          .from(reviews)
          .where(and(eq(reviews.userId, user.id), eq(reviews.productId, p.id)))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const isFav = fav.length > 0;
  const shipText = p.isPersonalized
    ? `Kişiye özel hazırlanır, ${settings.personalizedDays} içinde kargoya verilir. Kişiye özel ürünlerde cayma hakkı yoktur.`
    : `${settings.shipDays} içinde kargoda. ${settings.returnDays} gün içinde iade.`;
  const showSizeGuide = p.sizes.some((s) => /^(XS|S|M|L|XL|\dXL)$/.test(s));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.summary || p.description.slice(0, 300),
    image: data.images.map((i) => (i.url.startsWith('http') ? i.url : `${appUrl()}${i.url}`)),
    sku: data.variants[0]?.sku || p.slug,
    brand: { '@type': 'Brand', name: settings.storeName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TRY',
      price: (p.price / 100).toFixed(2),
      availability: data.variants.some((v) => v.isActive && (!p.trackStock || v.stock > 0)) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${appUrl()}/urun/${p.slug}`,
    },
    ...(data.rating.count ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: data.rating.avg.toFixed(1), reviewCount: data.rating.count } } : {}),
  };

  const favButton = (
    <form action={toggleFavorite.bind(null, p.id, p.slug)}>
      <button type="submit" className={isFav ? 'fav on' : 'fav'} aria-pressed={isFav} aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'} data-testid="favori">
        <IconHeart filled={isFav} />
      </button>
    </form>
  );

  return (
    <div className="wrap product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav className="crumbs" aria-label="Konum">
        <Link href="/">Ana sayfa</Link>
        <span aria-hidden>/</span>
        {data.categorySlug ? <Link href={`/urunler?kategori=${data.categorySlug}`}>{data.categoryName}</Link> : <Link href="/urunler">Ürünler</Link>}
        <span aria-hidden>/</span>
        <span>{p.name}</span>
      </nav>
      {!p.isActive ? <p className="msg msg-err">Bu ürün satışta değil, yalnızca yöneticiler görebilir.</p> : null}

      <ProductView
        product={{
          id: p.id,
          name: p.name,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          colorLabel: p.colorLabel,
          sizeLabel: p.sizeLabel,
          colors: p.colors,
          sizes: p.sizes,
          customFields: p.customFields,
          trackStock: p.trackStock,
          isPersonalized: p.isPersonalized,
        }}
        images={data.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl || i.url, alt: i.alt, color: i.color }))}
        variants={data.variants.map((v) => ({ id: v.id, color: v.color, size: v.size, stock: v.stock, priceOverride: v.priceOverride, isActive: v.isActive }))}
        shipText={shipText}
        showSizeGuide={showSizeGuide}
        favorite={favButton}
      />

      <div className="pd-info">
        <section className="pd-desc" aria-labelledby="aciklama-h">
          <h2 id="aciklama-h">Ürün açıklaması</h2>
          {p.summary ? <p className="pd-summary">{p.summary}</p> : null}
          {p.description.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {p.details.length ? (
            <ul className="specs">
              {p.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
          {p.isPersonalized ? (
            <p className="note">Bu ürün senin yazdığın bilgilerle kişiye özel hazırlandığı için Mesafeli Sözleşmeler Yönetmeliği md. 15/1-ç gereği cayma hakkı kapsamında değildir. Üretim hatası olursa ücretsiz düzeltiriz.</p>
          ) : null}
        </section>

        <section className="pd-reviews" aria-labelledby="yorum-h" id="yorumlar">
          <h2 id="yorum-h">Yorumlar</h2>
          {data.rating.count ? (
            <p className="rating-sum">
              <span className="stars" aria-label={`5 üzerinden ${data.rating.avg.toFixed(1)}`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <IconStar key={n} filled={n <= Math.round(data.rating.avg)} />
                ))}
              </span>
              <strong>{data.rating.avg.toFixed(1)}</strong> <span className="muted">({data.rating.count} yorum)</span>
            </p>
          ) : (
            <p className="muted">Henüz yorum yok.</p>
          )}
          {revs.map((r) => (
            <article key={r.id} className="review">
              <p className="review-head">
                <span className="stars" aria-label={`5 üzerinden ${r.rating}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <IconStar key={n} filled={n <= r.rating} size={14} />
                  ))}
                </span>
                <strong>{r.authorName}</strong>
                <span className="muted">{formatDate(r.createdAt, false)}</span>
              </p>
              <p>{r.body}</p>
            </article>
          ))}
          {user && bought.length ? (
            myReview[0]?.status === 'pending' ? (
              <p className="msg msg-ok">Yorumun alındı. İncelendikten sonra yayınlanacak.</p>
            ) : (
              <ReviewForm productId={p.id} slug={p.slug} />
            )
          ) : (
            <p className="muted small">Ürünü satın alıp teslim aldıktan sonra yorum yazabilirsin.</p>
          )}
        </section>
      </div>

      {related.items.length ? (
        <section className="sec" aria-labelledby="benzer-h">
          <h2 id="benzer-h" className="sec-title">
            Bunlara da bak
          </h2>
          <div className="grid">
            {related.items.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
