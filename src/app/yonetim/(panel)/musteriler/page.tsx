import Link from 'next/link';
import { desc, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { orders, users } from '@/db/schema';
import { formatDate, formatPhone } from '@/lib/format';
import { formatTL } from '@/lib/money';
import { requireAdmin } from '@/lib/auth';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomersPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 60) : '';
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const paid = sql`${orders.status} in ('paid','preparing','shipped','delivered','return_requested')`;
  const rows = await db
    .select({
      email: orders.email,
      name: sql<string>`max((${orders.shippingAddress}->>'firstName') || ' ' || (${orders.shippingAddress}->>'lastName'))`,
      phone: sql<string>`max(${orders.phone})`,
      count: sql<number>`count(*) filter (where ${paid})`.mapWith(Number),
      spent: sql<number>`coalesce(sum(${orders.total} - ${orders.refundTotal}) filter (where ${paid}), 0)`.mapWith(Number),
      last: sql<Date>`max(${orders.createdAt})`.mapWith((v: string | Date) => new Date(v)),
      member: sql<boolean>`bool_or(${orders.userId} is not null)`,
    })
    .from(orders)
    .where(q ? or(ilike(orders.email, like), ilike(orders.phone, like), sql`(${orders.shippingAddress}->>'firstName') || ' ' || (${orders.shippingAddress}->>'lastName') ilike ${like}`) : undefined)
    .groupBy(orders.email)
    .orderBy(desc(sql`max(${orders.createdAt})`))
    .limit(200);
  const members = await db.$count(users);

  return (
    <>
      <div className="adm-top">
        <h1>Müşteriler</h1>
        <form className="searchbar" action="/yonetim/musteriler">
          <input name="q" defaultValue={q} placeholder="E-posta, ad veya telefon" aria-label="Müşteri ara" />
          <button type="submit" className="btn btn-ghost btn-sm">
            Ara
          </button>
        </form>
      </div>
      <p className="muted">{members} kayıtlı üye. Aşağıda sipariş veren herkes (üye ve misafir) e-posta adresine göre listelenir.</p>
      <section className="panel">
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>Telefon</th>
                  <th className="num">Sipariş</th>
                  <th className="num">Harcama</th>
                  <th>Son sipariş</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email}>
                    <td>
                      <Link href={`/yonetim/siparisler?q=${encodeURIComponent(r.email)}`}>{r.name}</Link>
                      <div className="muted">
                        {r.email}
                        {r.member ? ' · üye' : ''}
                      </div>
                    </td>
                    <td className="sel">{formatPhone(r.phone)}</td>
                    <td className="num">{r.count}</td>
                    <td className="num">{formatTL(r.spent)}</td>
                    <td className="muted">{formatDate(r.last, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Henüz müşteri yok.</p>
        )}
      </section>
    </>
  );
}
