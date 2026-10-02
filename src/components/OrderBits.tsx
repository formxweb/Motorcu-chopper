import Link from 'next/link';
import type { Address, OrderStatus, orderEvents, orderItems } from '@/db/schema';
import { formatDate, formatPhone } from '@/lib/format';
import { formatTL } from '@/lib/money';
import { PROGRESS_STEPS, STATUS_LABEL, STATUS_TONE, progressIndex } from '@/lib/status';

type Item = typeof orderItems.$inferSelect;
type Event = typeof orderEvents.$inferSelect;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status status-${STATUS_TONE[status]}`} data-testid="durum">
      {STATUS_LABEL[status]}
    </span>
  );
}

export function OrderProgress({ status }: { status: OrderStatus }) {
  const idx = progressIndex(status);
  if (idx < 0) return null;
  return (
    <ol className="progress" aria-label="Sipariş durumu">
      {PROGRESS_STEPS.map((s, i) => (
        <li key={s.key} className={i < idx || (i === idx && status === 'delivered') ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>
          <span className="progress-dot" />
          <span>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ events, showPrivate = false }: { events: Event[]; showPrivate?: boolean }) {
  const list = events.filter((e) => showPrivate || e.isPublic);
  if (!list.length) return null;
  return (
    <ol className="timeline">
      {list.map((e) => (
        <li key={e.id} className={e.isPublic ? '' : 'private'}>
          <time dateTime={e.createdAt.toISOString()}>{formatDate(e.createdAt)}</time>
          <p>{e.message}</p>
          {showPrivate ? (
            <small>
              {e.isPublic ? 'Müşteri görüyor' : 'İç not'} · {e.actor}
            </small>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ItemsList({ items, linkProducts = true }: { items: Item[]; linkProducts?: boolean }) {
  return (
    <ul className="order-items">
      {items.map((i) => (
        <li key={i.id}>
          <span className="oi-img">{i.imageUrl ? <img src={i.imageUrl} alt="" width={72} height={90} /> : null}</span>
          <span className="oi-text">
            {linkProducts && i.productSlug ? <Link href={`/urun/${i.productSlug}`}>{i.productName}</Link> : <strong>{i.productName}</strong>}
            <small>
              {[i.color && `${i.colorLabel}: ${i.color}`, i.size && `${i.sizeLabel}: ${i.size}`, i.sku && `Stok kodu: ${i.sku}`].filter(Boolean).join(' · ')}
            </small>
            {i.customization.map((c) => (
              <small key={c.label} className="oi-custom">
                {c.label}: <strong>“{c.value}”</strong>
              </small>
            ))}
          </span>
          <span className="oi-qty">{i.quantity} adet</span>
          <span className="oi-price">{formatTL(i.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

export function AddressCard({ title, a, extra }: { title: string; a: Address; extra?: React.ReactNode }) {
  return (
    <div className="addr-card">
      <h3>{title}</h3>
      <p>
        {a.firstName} {a.lastName}
        <br />
        {a.line}
        <br />
        {a.district} / {a.city} {a.zip}
        <br />
        {formatPhone(a.phone)}
      </p>
      {extra}
    </div>
  );
}

export function TotalsList({
  o,
}: {
  o: { subtotal: number; discountTotal: number; discountCode: string; shippingTotal: number; total: number; paidTotal: number | null; installment: number | null; refundTotal: number };
}) {
  return (
    <dl className="totals">
      <div>
        <dt>Ara toplam</dt>
        <dd>{formatTL(o.subtotal)}</dd>
      </div>
      {o.discountTotal ? (
        <div>
          <dt>İndirim{o.discountCode ? ` (${o.discountCode})` : ''}</dt>
          <dd>−{formatTL(o.discountTotal)}</dd>
        </div>
      ) : null}
      <div>
        <dt>Kargo</dt>
        <dd>{o.shippingTotal ? formatTL(o.shippingTotal) : 'Ücretsiz'}</dd>
      </div>
      <div className="grand">
        <dt>Toplam</dt>
        <dd>{formatTL(o.total)}</dd>
      </div>
      {o.paidTotal && o.paidTotal !== o.total ? (
        <div>
          <dt>Karttan çekilen{o.installment && o.installment > 1 ? ` (${o.installment} taksit)` : ''}</dt>
          <dd>{formatTL(o.paidTotal)}</dd>
        </div>
      ) : null}
      {o.refundTotal ? (
        <div>
          <dt>İade edilen</dt>
          <dd>{formatTL(o.refundTotal)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
