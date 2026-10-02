import Link from 'next/link';
import { and, desc, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import { StatusBadge } from '@/components/OrderBits';
import { db } from '@/db';
import { orders, type OrderStatus } from '@/db/schema';
import { formatShortDate } from '@/lib/format';
import { formatTL } from '@/lib/money';

type SP = Promise<Record<string, string | string[] | undefined>>;

const GROUPS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: 'islem', label: 'İşlem bekleyen', statuses: ['paid', 'preparing', 'return_requested'] },
  { key: 'kargoda', label: 'Kargoda', statuses: ['shipped'] },
  { key: 'teslim', label: 'Teslim edildi', statuses: ['delivered'] },
  { key: 'iptal', label: 'İptal ve iade', statuses: ['cancelled', 'refunded'] },
  { key: 'odenmemis', label: 'Ödenmemiş', statuses: ['pending_payment', 'payment_failed'] },
];
const PAGE = 50;

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const durum = typeof sp.durum === 'string' ? sp.durum : 'tumu';
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 60) : '';
  const sayfa = Math.max(1, Number.parseInt(typeof sp.sayfa === 'string' ? sp.sayfa : '1', 10) || 1);
  const group = GROUPS.find((g) => g.key === durum);

  const conds: SQL[] = [];
  if (group) {
    const g = inArray(orders.status, group.statuses);
    conds.push(group.key === 'islem' ? (or(g, and(ne(orders.requestType, ''), ne(orders.status, 'cancelled'))) as SQL) : g);
  } else {
    conds.push(ne(orders.status, 'pending_payment'));
  }
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const c = or(
      ilike(orders.number, like),
      ilike(orders.email, like),
      ilike(orders.phone, like),
      sql`(${orders.shippingAddress}->>'firstName') || ' ' || (${orders.shippingAddress}->>'lastName') ilike ${like}`,
    );
    if (c) conds.push(c);
  }
  const where = and(...conds);
  const [list, counts] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PAGE).offset((sayfa - 1) * PAGE),
    db
      .select({ status: orders.status, n: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .groupBy(orders.status),
  ]);
  const countOf = (sts: OrderStatus[]) => counts.filter((c) => sts.includes(c.status)).reduce((s, c) => s + c.n, 0);
  const href = (d: string, extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ ...(d !== 'tumu' ? { durum: d } : {}), ...(q ? { q } : {}), ...extra });
    const s = p.toString();
    return s ? `/yonetim/siparisler?${s}` : '/yonetim/siparisler';
  };

  return (
    <>
      <div className="adm-top">
        <h1>Siparişler</h1>
        <form className="searchbar" action="/yonetim/siparisler">
          {durum !== 'tumu' ? <input type="hidden" name="durum" value={durum} /> : null}
          <input name="q" defaultValue={q} placeholder="No, e-posta, ad veya telefon" aria-label="Sipariş ara" />
          <button type="submit" className="btn btn-ghost btn-sm">
            Ara
          </button>
        </form>
      </div>
      <nav className="tabs" aria-label="Durum">
        <Link href={href('tumu')} className={!group ? 'on' : ''}>
          Tümü
        </Link>
        {GROUPS.map((g) => (
          <Link key={g.key} href={href(g.key)} className={group?.key === g.key ? 'on' : ''}>
            {g.label}
            <b>{countOf(g.statuses)}</b>
          </Link>
        ))}
      </nav>
      <section className="panel">
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl" data-testid="siparis-tablosu">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Tarih</th>
                  <th>Müşteri</th>
                  <th>Durum</th>
                  <th>Talep</th>
                  <th className="num">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/yonetim/siparisler/${o.id}`}>{o.number}</Link>
                    </td>
                    <td className="muted">{formatShortDate(o.createdAt)}</td>
                    <td>
                      {o.shippingAddress.firstName} {o.shippingAddress.lastName}
                      <div className="muted">{o.email}</div>
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td>{o.requestType === 'cancel' ? <span className="stock stock-bad">İptal istiyor</span> : o.requestType === 'return' ? <span className="stock stock-bad">İade istiyor</span> : ''}</td>
                    <td className="num">{formatTL(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Bu filtreye uyan sipariş yok.</p>
        )}
        {list.length === PAGE || sayfa > 1 ? (
          <div className="row">
            {sayfa > 1 ? (
              <Link className="btn btn-ghost btn-sm" href={href(durum, { sayfa: String(sayfa - 1) })}>
                Önceki sayfa
              </Link>
            ) : null}
            {list.length === PAGE ? (
              <Link className="btn btn-ghost btn-sm" href={href(durum, { sayfa: String(sayfa + 1) })}>
                Sonraki sayfa
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  );
}
