import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { AddressCard, ItemsList, OrderProgress, StatusBadge, Timeline, TotalsList } from '@/components/OrderBits';
import { OrderRequestForm } from '@/components/shop/OrderRequestForm';
import { db } from '@/db';
import { orderEvents, orderItems } from '@/db/schema';
import { formatDate } from '@/lib/format';
import { accessibleOrder } from '@/lib/order-access';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Sipariş', robots: { index: false } };

type Params = Promise<{ number: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function OrderPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { number } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === 'string' ? sp.t : '';
  const odeme = typeof sp.odeme === 'string' ? sp.odeme : '';
  const o = await accessibleOrder(number, token);
  if (!o) notFound();
  const [items, events, settings] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(asc(orderItems.productName)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(asc(orderEvents.createdAt)),
    getSettings(),
  ]);
  const t = token || o.accessToken;
  const pi = o.paymentInfo;
  const deliveredDays = o.deliveredAt ? (Date.now() - o.deliveredAt.getTime()) / 86400000 : 0;
  const canReturn = o.status === 'delivered' && !o.requestType && deliveredDays <= settings.returnDays && items.some((i) => !i.isPersonalized);
  const canCancel = (o.status === 'paid' || o.status === 'preparing') && !o.requestType;

  return (
    <div className="wrap order-page">
      {o.status === 'paid' && odeme === 'tamam' ? (
        <div className="banner banner-ok" data-testid="odeme-basarili">
          <h1>Siparişin alındı, teşekkürler!</h1>
          <p>
            Ödemen onaylandı. Sipariş numaran <strong>{o.number}</strong>. Onay e-postası <strong>{o.email}</strong> adresine gönderildi.
          </p>
        </div>
      ) : o.status === 'payment_failed' ? (
        <div className="banner banner-err" data-testid="odeme-basarisiz">
          <h1>Ödeme alınamadı</h1>
          <p>{pi?.errorMessage ? `${pi.errorMessage}. ` : ''}Kartından çekim yapılmadı. Ürünler sepetinde duruyor, tekrar deneyebilirsin.</p>
          <Link className="btn btn-primary" href="/sepet">
            Sepete dön ve tekrar dene
          </Link>
        </div>
      ) : o.status === 'pending_payment' ? (
        <div className="banner banner-warn">
          <h1>Ödeme bekleniyor</h1>
          <p>Ödeme sayfasında işlemi tamamlamadıysan siparişin 40 dakika içinde otomatik olarak iptal edilir ve ürünler sepetinde kalır.</p>
        </div>
      ) : (
        <h1 className="order-title">Sipariş {o.number}</h1>
      )}

      <div className="order-head">
        <p>
          <span className="muted">Sipariş no</span> <strong data-testid="siparis-no">{o.number}</strong>
        </p>
        <p>
          <span className="muted">Tarih</span> {formatDate(o.createdAt)}
        </p>
        <StatusBadge status={o.status} />
      </div>

      <OrderProgress status={o.status} />

      {o.trackingNumber ? (
        <div className="tracking" data-testid="kargo-bilgisi">
          <p>
            <strong>{o.carrier}</strong> takip numarası: <span className="sel">{o.trackingNumber}</span>
          </p>
          {o.trackingUrl ? (
            <a className="btn btn-primary btn-sm" href={o.trackingUrl} target="_blank" rel="noopener noreferrer">
              Kargonu takip et
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="order-grid">
        <section aria-labelledby="urunler-h">
          <h2 id="urunler-h">Ürünler</h2>
          <ItemsList items={items} />
          <TotalsList o={o} />
          {pi?.lastFourDigits ? (
            <p className="small muted">
              Ödeme: {pi.cardAssociation ? pi.cardAssociation.replace(/_/g, ' ').toLowerCase() : 'kart'} •••• {pi.lastFourDigits}
              {o.installment && o.installment > 1 ? `, ${o.installment} taksit` : ', tek çekim'}
            </p>
          ) : null}
        </section>
        <section aria-labelledby="gecmis-h">
          <h2 id="gecmis-h">Sipariş geçmişi</h2>
          <Timeline events={events} />
          <div className="order-addrs">
            <AddressCard title="Teslimat adresi" a={o.shippingAddress} />
            {o.billing.type === 'corporate' ? (
              <div className="addr-card">
                <h3>Fatura</h3>
                <p>
                  {o.billing.companyName}
                  <br />
                  {o.billing.taxOffice} / {o.billing.taxNumber}
                </p>
              </div>
            ) : !o.billing.sameAsShipping ? (
              <AddressCard title="Fatura adresi" a={o.billing.address} />
            ) : null}
          </div>
          <div className="order-actions">
            {canCancel ? <OrderRequestForm number={o.number} token={t} kind="cancel" /> : null}
            {canReturn ? <OrderRequestForm number={o.number} token={t} kind="return" /> : null}
            {o.requestType ? <p className="msg msg-warn">Açık talebin var, en kısa sürede dönüş yapacağız.</p> : null}
            {o.contractsHtml ? (
              <details className="contracts">
                <summary className="link-btn">Sözleşmeleri görüntüle</summary>
                <div className="prose contract-body" dangerouslySetInnerHTML={{ __html: o.contractsHtml }} />
              </details>
            ) : null}
          </div>
          <p className="small muted">
            Sorun mu var? {settings.contactPhone ? <span className="sel">{settings.contactPhone}</span> : null}
            {settings.contactEmail ? (
              <>
                {' '}
                veya <span className="sel">{settings.contactEmail}</span>
              </>
            ) : null}{' '}
            üzerinden sipariş numaranla bize ulaş.
          </p>
        </section>
      </div>
    </div>
  );
}
