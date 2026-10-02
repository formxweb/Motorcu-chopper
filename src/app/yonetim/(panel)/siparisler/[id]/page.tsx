import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { OrderActions } from '@/components/admin/OrderActions';
import { AddressCard, ItemsList, StatusBadge, Timeline, TotalsList } from '@/components/OrderBits';
import { db } from '@/db';
import { orderEvents, orderItems, orders } from '@/db/schema';
import { formatDate, formatPhone } from '@/lib/format';
import { formatTL } from '@/lib/money';
import { getSettings } from '@/lib/settings';
import { isUuid } from '@/lib/utils';

type Params = Promise<{ id: string }>;

export default async function AdminOrderPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [o] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!o) notFound();
  const [items, events, settings] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.productName)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.createdAt)),
    getSettings(),
  ]);
  const pi = o.paymentInfo;
  const refundable = Math.max(0, (o.paidTotal ?? o.total) - o.refundTotal);
  const ship = o.shippingAddress;
  const label = `${ship.firstName} ${ship.lastName}\n${ship.line}\n${ship.district} / ${ship.city} ${ship.zip}\n${ship.phone}`;
  const hasCustom = items.some((i) => i.customization.length);

  return (
    <>
      <div className="adm-top">
        <div>
          <p className="muted small">
            <Link href="/yonetim/siparisler">Siparişler</Link> / {o.number}
          </p>
          <h1 data-testid="yonetim-siparis-no">{o.number}</h1>
        </div>
        <div className="adm-top-actions">
          <StatusBadge status={o.status} />
          <Link className="btn btn-ghost btn-sm" href={`/siparis/${o.number}?t=${o.accessToken}`} target="_blank">
            Müşterinin gördüğü sayfa
          </Link>
        </div>
      </div>

      {o.requestType ? (
        <div className="alert alert-red">
          <strong>{o.requestType === 'cancel' ? 'Müşteri iptal istiyor.' : 'Müşteri iade istiyor.'}</strong> {o.requestNote ? `“${o.requestNote}”` : ''}
        </div>
      ) : null}
      {pi?.sandbox ? <div className="alert">Bu sipariş iyzico test modunda ödendi, gerçek para hareketi yok.</div> : null}
      {o.note ? (
        <div className="alert">
          <strong>Müşteri notu:</strong> {o.note}
        </div>
      ) : null}

      <div className="cols">
        <div>
          <section className="panel">
            <h2>Ürünler</h2>
            {hasCustom ? <p className="custom-hl">Bu siparişte kişiye özel nakış var. Yazıları aşağıdan birebir kopyala.</p> : null}
            <ItemsList items={items} />
            <TotalsList o={o} />
          </section>
          <section className="panel">
            <h2>Sipariş geçmişi</h2>
            <Timeline events={events} showPrivate />
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>İşlemler</h2>
            {o.status === 'pending_payment' || o.status === 'payment_failed' ? (
              <p className="muted">Bu siparişin ödemesi tamamlanmadı, işlem yapılamaz.</p>
            ) : (
              <OrderActions
                orderId={o.id}
                status={o.status}
                requestType={o.requestType}
                carriers={settings.carriers.map((c) => ({ id: c.id, name: c.name }))}
                carrierName={o.carrier}
                trackingNumber={o.trackingNumber}
                refundable={refundable}
              />
            )}
          </section>
          <section className="panel">
            <h2>Müşteri</h2>
            <dl className="kv">
              <dt>E-posta</dt>
              <dd className="sel">{o.email}</dd>
              <dt>Telefon</dt>
              <dd className="sel">{formatPhone(o.phone)}</dd>
              <dt>Üyelik</dt>
              <dd>{o.userId ? 'Üye' : 'Misafir'}</dd>
              <dt>Tarih</dt>
              <dd>{formatDate(o.createdAt)}</dd>
            </dl>
            <AddressCard title="Teslimat adresi" a={ship} extra={<textarea readOnly rows={4} value={label} aria-label="Kargo etiketi için adres" className="sel" />} />
            {o.billing.type === 'corporate' ? (
              <div className="addr-card">
                <h3>Kurumsal fatura</h3>
                <p>
                  {o.billing.companyName}
                  <br />
                  {o.billing.taxOffice} / {o.billing.taxNumber}
                </p>
              </div>
            ) : o.billing.identityNumber ? (
              <p className="small">T.C. kimlik no: {o.billing.identityNumber}</p>
            ) : null}
            {!o.billing.sameAsShipping ? <AddressCard title="Fatura adresi" a={o.billing.address} /> : null}
          </section>
          <section className="panel">
            <h2>Ödeme</h2>
            <dl className="kv">
              <dt>iyzico ödeme no</dt>
              <dd className="sel">{o.paymentId || '-'}</dd>
              <dt>Kart</dt>
              <dd>{pi?.lastFourDigits ? `${pi.cardAssociation ?? ''} ${pi.cardFamily ?? ''} •••• ${pi.lastFourDigits}` : '-'}</dd>
              <dt>Taksit</dt>
              <dd>{o.installment && o.installment > 1 ? `${o.installment} taksit` : 'Tek çekim'}</dd>
              <dt>Çekilen</dt>
              <dd>{o.paidTotal ? formatTL(o.paidTotal) : '-'}</dd>
              <dt>İade edilen</dt>
              <dd>{formatTL(o.refundTotal)}</dd>
              <dt>Ödeme tarihi</dt>
              <dd>{o.paidAt ? formatDate(o.paidAt) : '-'}</dd>
              {pi?.errorMessage ? (
                <>
                  <dt>Hata</dt>
                  <dd>{pi.errorMessage}</dd>
                </>
              ) : null}
            </dl>
          </section>
          {o.contractsHtml ? (
            <section className="panel">
              <details>
                <summary>Sözleşmeler (sipariş anındaki kopya)</summary>
                <div className="prose contract-body" dangerouslySetInnerHTML={{ __html: o.contractsHtml }} />
              </details>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
