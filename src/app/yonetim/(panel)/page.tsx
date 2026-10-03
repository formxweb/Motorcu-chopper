import Link from 'next/link';
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { runCleanup } from '@/app/actions/admin-orders';
import { StatusBadge } from '@/components/OrderBits';
import { db } from '@/db';
import { orders, products, variants, type OrderStatus } from '@/db/schema';
import { appUrl, smtpReady, storageMode } from '@/lib/env';
import { formatShortDate } from '@/lib/format';
import { formatTL } from '@/lib/money';
import { cleanupExpiredOrders } from '@/lib/orders';
import { getPaymentSetup } from '@/lib/payment';
import { getSettings, missingSellerFields } from '@/lib/settings';

const PAID: OrderStatus[] = ['paid', 'preparing', 'shipped', 'delivered', 'return_requested', 'refunded', 'cancelled'];

function istanbulMidnight(daysAgo = 0): Date {
  const now = new Date();
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const d = new Date(`${key}T00:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

export default async function Dashboard() {
  try {
    await cleanupExpiredOrders(5);
  } catch (e) {
    console.error('[özet] temizlik', e);
  }
  const [settings, pay] = await Promise.all([getSettings(), getPaymentSetup()]);
  const revenue = (from: Date) =>
    db
      .select({
        sum: sql<number>`coalesce(sum(coalesce(${orders.paidTotal}, ${orders.total}) - ${orders.refundTotal}), 0)`.mapWith(Number),
        n: sql<number>`count(*) filter (where ${orders.status} not in ('cancelled', 'refunded'))`.mapWith(Number),
      })
      .from(orders)
      .where(and(inArray(orders.status, PAID), gte(orders.paidAt, from)));

  const [today, last30, toShip, requests, lowStock, recent] = await Promise.all([
    revenue(istanbulMidnight(0)),
    revenue(istanbulMidnight(30)),
    db.select().from(orders).where(inArray(orders.status, ['paid', 'preparing'] as OrderStatus[])).orderBy(asc(orders.createdAt)).limit(20),
    db.select().from(orders).where(and(ne(orders.requestType, ''), ne(orders.status, 'cancelled'))).orderBy(asc(orders.updatedAt)).limit(20),
    db
      .select({ id: products.id, name: products.name, color: variants.color, size: variants.size, stock: variants.stock })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(products.trackStock, true), eq(products.isActive, true), eq(variants.isActive, true), lte(variants.stock, 2)))
      .orderBy(asc(variants.stock))
      .limit(15),
    db.select().from(orders).where(ne(orders.status, 'pending_payment')).orderBy(desc(orders.createdAt)).limit(8),
  ]);

  const seller = missingSellerFields(settings);
  const checklist = [
    {
      ok: pay.ready && !pay.testMode,
      title: 'Kartla ödeme',
      hint: !pay.ready
        ? 'Ayarlar > Shopier ile kartla ödeme bölümüne Shopier API bilgilerini gir (şirketin varsa iyzico da kullanılabilir).'
        : pay.testMode
          ? 'iyzico test modunda: gerçek ödeme alınmıyor. Canlı anahtarları gir ya da Shopier bağla.'
          : `${pay.label} ile ödeme açık.`,
      href: '/yonetim/ayarlar#shopier',
    },
    { ok: seller.length === 0, title: 'Satıcı ve iletişim bilgileri', hint: seller.length ? `Eksik: ${seller.join(', ')}. Sözleşmelerde görünür.` : 'Tamam.' },
    { ok: smtpReady(), title: 'E-posta gönderimi', hint: smtpReady() ? 'SMTP ayarlı.' : 'SMTP_HOST, SMTP_USER, SMTP_PASS ekle. Şimdilik e-postalar yalnızca E-postalar sayfasına kaydediliyor.' },
    { ok: true, title: 'Görsel depolama', hint: storageMode() === 'supabase' ? 'Supabase Storage ayarlı.' : storageMode() === 'database' ? 'Fotoğraflar veritabanında saklanıyor. Yüzlerce ürün fotoğrafı olacaksa Supabase Storage eklenebilir (SUPABASE_URL, SUPABASE_SECRET_KEY).' : 'Yerel klasör (geliştirme).' },
    { ok: appUrl().startsWith('https://'), title: 'Site adresi (APP_URL)', hint: `Şu an: ${appUrl()}` },
    { ok: !!process.env.CRON_SECRET, title: 'Günlük temizlik görevi (isteğe bağlı)', hint: process.env.CRON_SECRET ? 'Ayarlı.' : 'CRON_SECRET ortam değişkenine uzun rastgele bir metin ekle. Eklemezsen yarım kalan ödemeler bu sayfayı her açtığında kontrol edilir.' },
    { ok: settings.storeOpen, title: 'Mağaza ziyaretçilere açık', hint: settings.storeOpen ? 'Açık.' : 'Ayarlar > Mağaza bölümünden aç.' },
  ];
  const missing = checklist.filter((c) => !c.ok).length;

  return (
    <>
      <div className="adm-top">
        <h1>Özet</h1>
        <div className="adm-top-actions">
          <form action={runCleanup}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Yarım kalan ödemeleri kontrol et
            </button>
          </form>
          <Link href="/yonetim/urunler/yeni" className="btn btn-primary btn-sm">
            Yeni ürün
          </Link>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Bugünkü satış</span>
          <strong data-testid="bugun-ciro">{formatTL(today[0]?.sum ?? 0)}</strong>
          <span>{today[0]?.n ?? 0} sipariş</span>
        </div>
        <div className="kpi">
          <span>Son 30 gün</span>
          <strong>{formatTL(last30[0]?.sum ?? 0)}</strong>
          <span>{last30[0]?.n ?? 0} sipariş</span>
        </div>
        <div className="kpi">
          <span>Kargolanacak</span>
          <strong>{toShip.length}</strong>
          <span>alındı ve hazırlanıyor</span>
        </div>
        <div className="kpi">
          <span>Açık talepler</span>
          <strong>{requests.length}</strong>
          <span>iptal ve iade</span>
        </div>
      </div>

      <div className="cols">
        <div>
          <section className="panel">
            <div className="panel-head">
              <h2>Kargolanacak siparişler</h2>
              <Link href="/yonetim/siparisler?durum=islem">Tümü</Link>
            </div>
            {toShip.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Sipariş</th>
                      <th>Müşteri</th>
                      <th>Tarih</th>
                      <th>Durum</th>
                      <th className="num">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toShip.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/yonetim/siparisler/${o.id}`}>{o.number}</Link>
                        </td>
                        <td>
                          {o.shippingAddress.firstName} {o.shippingAddress.lastName}
                        </td>
                        <td className="muted">{formatShortDate(o.createdAt)}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="num">{formatTL(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Kargolanmayı bekleyen sipariş yok.</p>
            )}
          </section>

          {requests.length ? (
            <section className="panel">
              <h2>İptal ve iade talepleri</h2>
              <ul className="check-list">
                {requests.map((o) => (
                  <li key={o.id}>
                    <span>
                      <Link href={`/yonetim/siparisler/${o.id}`}>{o.number}</Link> {o.requestType === 'cancel' ? 'iptal istiyor' : 'iade istiyor'}
                      {o.requestNote ? <small>&quot;{o.requestNote}&quot;</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="panel">
            <div className="panel-head">
              <h2>Son siparişler</h2>
              <Link href="/yonetim/siparisler">Tüm siparişler</Link>
            </div>
            {recent.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/yonetim/siparisler/${o.id}`}>{o.number}</Link>
                        </td>
                        <td className="muted">{formatShortDate(o.createdAt)}</td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="num">{formatTL(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Henüz sipariş yok.</p>
            )}
          </section>
        </div>

        <div>
          <section className="panel">
            <h2>{missing ? `Kurulum: ${missing} adım kaldı` : 'Kurulum tamam'}</h2>
            <ul className="check-list" data-testid="kurulum-listesi">
              {checklist.map((c) => (
                <li key={c.title} className={c.ok ? 'ok' : ''}>
                  <span>
                    {'href' in c && c.href && !c.ok ? <Link href={c.href}>{c.title}</Link> : c.title}
                    <small>{c.hint}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Azalan stok</h2>
            {lowStock.length ? (
              <table className="tbl">
                <tbody>
                  {lowStock.map((v, i) => (
                    <tr key={i}>
                      <td>
                        <Link href={`/yonetim/urunler/${v.id}`}>{v.name}</Link>
                        <div className="muted">{[v.color, v.size].filter(Boolean).join(' / ')}</div>
                      </td>
                      <td className="num">{v.stock <= 0 ? <span className="stock stock-bad">Tükendi</span> : `${v.stock} adet`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">Stoğu azalan ürün yok.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
