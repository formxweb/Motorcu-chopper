import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { CheckoutForm } from '@/components/shop/CheckoutForm';
import { db } from '@/db';
import { addresses } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { CITIES } from '@/lib/cities';
import { iyzicoConfig, iyzicoReady } from '@/lib/env';
import { contractsHtml } from '@/lib/legal';
import { formatTL } from '@/lib/money';
import { lineOptionsText } from '@/lib/orders';
import { computeTotals, evaluateDiscount } from '@/lib/pricing';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Ödeme', robots: { index: false } };

export default async function CheckoutPage() {
  const [cart, settings, user] = await Promise.all([getCart(), getSettings(), getCurrentUser()]);
  if (!cart.lines.length || cart.hasProblems) redirect('/sepet');
  const discount = cart.discountCode ? await evaluateDiscount(cart.discountCode, cart.subtotal) : null;
  const totals = computeTotals(cart.subtotal, discount && discount.ok ? discount.amount : 0, settings);
  const saved = user
    ? await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), asc(addresses.createdAt))
    : [];
  const contracts = contractsHtml({
    settings,
    buyer: null,
    items: cart.lines.map((l) => ({ name: l.name, options: lineOptionsText(l), quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal, isPersonalized: l.isPersonalized })),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    shippingTotal: totals.shippingTotal,
    total: totals.total,
    date: new Date(),
  });
  const cfg = iyzicoConfig();

  return (
    <div className="wrap checkout">
      <nav className="crumbs" aria-label="Konum">
        <Link href="/sepet">Sepet</Link>
        <span aria-hidden>/</span>
        <span>Teslimat ve ödeme</span>
      </nav>
      <h1>Siparişi tamamla</h1>
      {iyzicoReady() && cfg.sandbox ? (
        <p className="msg msg-warn" data-testid="test-modu">
          Ödeme sistemi test modunda. Bu sayfadan verilen siparişlerde gerçek ödeme alınmaz, gerçek kartlar çalışmaz.
        </p>
      ) : null}
      <div className="checkout-grid">
        <CheckoutForm
          user={user ? { email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone } : null}
          saved={saved.map((a) => ({ id: a.id, title: a.title, firstName: a.firstName, lastName: a.lastName, phone: a.phone, city: a.city, district: a.district, line: a.line, zip: a.zip }))}
          cities={CITIES}
          contractsHtml={contracts}
          totalText={formatTL(totals.total)}
        />
        <aside className="summary" aria-label="Sipariş özeti">
          <h2>Siparişin</h2>
          <ul className="mini-lines">
            {cart.lines.map((l) => (
              <li key={l.itemId}>
                <span className="mini-img">
                  {l.thumbUrl ? <img src={l.thumbUrl} alt="" width={64} height={80} /> : null}
                  <b>{l.quantity}</b>
                </span>
                <span className="mini-text">
                  <strong>{l.name}</strong>
                  <small>{lineOptionsText(l)}</small>
                </span>
                <span>{formatTL(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div>
              <dt>Ara toplam</dt>
              <dd>{formatTL(totals.subtotal)}</dd>
            </div>
            {totals.discountTotal ? (
              <div>
                <dt>İndirim{discount && discount.ok ? ` (${discount.code})` : ''}</dt>
                <dd>−{formatTL(totals.discountTotal)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Kargo</dt>
              <dd>{totals.shippingTotal ? formatTL(totals.shippingTotal) : 'Ücretsiz'}</dd>
            </div>
            <div className="grand">
              <dt>Toplam</dt>
              <dd data-testid="odeme-toplam">{formatTL(totals.total)}</dd>
            </div>
          </dl>
          <p className="small muted">Fiyatlara KDV dahildir. Taksit seçenekleri ödeme sayfasında kartına göre gösterilir.</p>
        </aside>
      </div>
    </div>
  );
}
