import type { Metadata } from 'next';
import Link from 'next/link';
import { removeCartItem, removeDiscount, setCartQuantity } from '@/app/actions/cart';
import { DiscountForm } from '@/components/shop/DiscountForm';
import { getCart } from '@/lib/cart';
import { getPaymentSetup } from '@/lib/payment';
import { formatTL } from '@/lib/money';
import { computeTotals, evaluateDiscount } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Sepet', robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

const PAYMENT_NOTES: Record<string, string> = {
  hata: 'Ödeme sonucu alınamadı. Kartından çekim yapıldıysa sipariş e-postan birkaç dakika içinde gelir; gelmezse bize yaz.',
  bulunamadi: 'Ödemeye ait sipariş bulunamadı. Kartından çekim yapıldıysa bize yaz.',
  kontrol: 'Ödeme sonucu kontrol edilirken bir sorun oluştu. Kartından çekim yapıldıysa sipariş e-postan birkaç dakika içinde gelir.',
};

export default async function CartPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const odeme = typeof sp.odeme === 'string' ? sp.odeme : '';
  const [cart, settings, pay] = await Promise.all([getCart(), getSettings(), getPaymentSetup()]);
  const discount = cart.discountCode ? await evaluateDiscount(cart.discountCode, cart.subtotal) : null;
  const totals = computeTotals(cart.subtotal, discount && discount.ok ? discount.amount : 0, settings);

  return (
    <div className="wrap cart-page">
      <h1>Sepetim</h1>
      {PAYMENT_NOTES[odeme] ? <p className="msg msg-err">{PAYMENT_NOTES[odeme]}</p> : null}
      {!cart.lines.length ? (
        <div className="empty">
          <p>Sepetin boş.</p>
          <Link className="btn btn-primary" href="/urunler">
            Alışverişe başla
          </Link>
        </div>
      ) : (
        <div className="cart-grid">
          <ul className="cart-lines" data-testid="sepet-satirlari">
            {cart.lines.map((l) => (
              <li key={l.itemId} className="cline">
                <Link href={`/urun/${l.slug}`} className="cline-img">
                  {l.thumbUrl ? <img src={l.thumbUrl} alt="" width={120} height={150} /> : null}
                </Link>
                <div className="cline-info">
                  <Link href={`/urun/${l.slug}`} className="cline-name">
                    {l.name}
                  </Link>
                  <p className="cline-opts">
                    {[l.color && `${l.colorLabel}: ${l.color}`, l.size && `${l.sizeLabel}: ${l.size}`].filter(Boolean).join(' · ')}
                  </p>
                  {l.customLines.map((c) => (
                    <p key={c.label} className="cline-opts">
                      {c.label}: <strong>“{c.value}”</strong>
                    </p>
                  ))}
                  {l.problem ? <p className="stock stock-bad">{l.problem}</p> : null}
                  <div className="cline-ctl">
                    <div className="qty qty-sm" role="group" aria-label="Adet">
                      <form action={setCartQuantity.bind(null, l.itemId, l.quantity - 1)}>
                        <button type="submit" aria-label="Bir azalt">
                          −
                        </button>
                      </form>
                      <output data-testid="satir-adet">{l.quantity}</output>
                      <form action={setCartQuantity.bind(null, l.itemId, l.quantity + 1)}>
                        <button type="submit" aria-label="Bir arttır" disabled={l.trackStock && l.quantity >= l.stock}>
                          +
                        </button>
                      </form>
                    </div>
                    <form action={removeCartItem.bind(null, l.itemId)}>
                      <button type="submit" className="link-btn">
                        Kaldır
                      </button>
                    </form>
                  </div>
                </div>
                <p className="cline-price">{formatTL(l.lineTotal)}</p>
              </li>
            ))}
          </ul>

          <aside className="summary" aria-label="Sipariş özeti">
            <h2>Sipariş özeti</h2>
            <dl className="totals">
              <div>
                <dt>Ara toplam</dt>
                <dd>{formatTL(totals.subtotal)}</dd>
              </div>
              {discount && discount.ok ? (
                <div>
                  <dt>
                    İndirim ({discount.code})
                    <form action={removeDiscount} className="inline">
                      <button type="submit" className="link-btn">
                        kaldır
                      </button>
                    </form>
                  </dt>
                  <dd>−{formatTL(totals.discountTotal)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Kargo</dt>
                <dd>{totals.shippingTotal ? formatTL(totals.shippingTotal) : 'Ücretsiz'}</dd>
              </div>
              <div className="grand">
                <dt>Toplam</dt>
                <dd data-testid="sepet-toplam">{formatTL(totals.total)}</dd>
              </div>
            </dl>
            {totals.freeShippingRemaining > 0 ? (
              <p className="ship-progress">
                Kargonun ücretsiz olması için <strong>{formatTL(totals.freeShippingRemaining)}</strong> daha ekle.
              </p>
            ) : null}
            {discount && !discount.ok ? <p className="msg msg-err">{discount.error}</p> : null}
            {!discount || !discount.ok ? <DiscountForm /> : null}
            {cart.hasProblems ? (
              <p className="msg msg-err">Sepetindeki bazı ürünlerin stoğu değişti. Adetleri düzenleyip devam et.</p>
            ) : pay.ready ? (
              <Link href="/odeme" className="btn btn-primary btn-lg full" data-testid="odemeye-gec">
                Siparişi tamamla
              </Link>
            ) : (
              <p className="msg msg-err">Online ödeme henüz aktif değil.</p>
            )}
            <p className="small muted">Ödeme, {pay.label ? `${pay.label} ` : ''}güvenli ödeme sayfasında kartla yapılır. Kart bilgilerin bize ulaşmaz.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
