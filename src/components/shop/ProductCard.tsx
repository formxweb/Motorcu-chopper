import Link from 'next/link';
import type { ProductCard as Card } from '@/lib/catalog';
import { discountPercent, formatTL } from '@/lib/money';

export function Price({ price, compareAt, large = false }: { price: number; compareAt: number | null; large?: boolean }) {
  const pct = discountPercent(price, compareAt);
  return (
    <span className={large ? 'price price-lg' : 'price'}>
      <span className="price-now">{formatTL(price)}</span>
      {pct > 0 && compareAt ? (
        <>
          <s className="price-was">{formatTL(compareAt)}</s>
          <span className="price-off">%{pct}</span>
        </>
      ) : null}
    </span>
  );
}

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const pct = discountPercent(p.price, p.compareAtPrice);
  const badge = p.soldOut ? 'Tükendi' : p.badge || (pct ? `%${pct} indirim` : '');
  return (
    <Link href={`/urun/${p.slug}`} className="card" data-testid="urun-karti">
      <span className="card-img">
        {p.thumbUrl ? (
          <img src={p.thumbUrl} alt={p.name} width={600} height={750} loading={priority ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <span className="card-noimg">Görsel yok</span>
        )}
        {p.altThumbUrl ? <img className="card-img-alt" src={p.altThumbUrl} alt="" width={600} height={750} loading="lazy" decoding="async" /> : null}
        {badge ? <span className={p.soldOut ? 'badge badge-off' : 'badge'}>{badge}</span> : null}
      </span>
      <span className="card-body">
        <span className="card-name">{p.name}</span>
        {p.summary ? <span className="card-sum">{p.summary}</span> : null}
        <span className="card-row">
          <Price price={p.price} compareAt={p.compareAtPrice} />
          {p.colors.length > 1 ? (
            <span className="dots" aria-label={`${p.colors.length} renk`}>
              {p.colors.slice(0, 5).map((c) => (
                <i key={c.name} style={{ background: c.hex }} title={c.name} />
              ))}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
