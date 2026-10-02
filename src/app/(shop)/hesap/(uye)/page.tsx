import type { Metadata } from 'next';
import Link from 'next/link';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { StatusBadge } from '@/components/OrderBits';
import { db } from '@/db';
import { orderItems, orders } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { formatTL } from '@/lib/money';

export const metadata: Metadata = { title: 'Siparişlerim', robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AccountOrdersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await requireUser('/hesap');
  const list = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, user.id), ne(orders.status, 'pending_payment')))
    .orderBy(desc(orders.createdAt))
    .limit(100);
  const items = list.length
    ? await db
        .select({ orderId: orderItems.orderId, imageUrl: orderItems.imageUrl, name: orderItems.productName })
        .from(orderItems)
        .where(inArray(orderItems.orderId, list.map((o) => o.id)))
    : [];
  const byOrder = new Map<string, { imageUrl: string; name: string }[]>();
  for (const i of items) {
    const l = byOrder.get(i.orderId) ?? [];
    l.push(i);
    byOrder.set(i.orderId, l);
  }

  return (
    <>
      {sp.sifre === 'yenilendi' ? <p className="msg msg-ok">Şifren yenilendi.</p> : null}
      <h1>Siparişlerim</h1>
      {!list.length ? (
        <div className="empty">
          <p>Henüz siparişin yok.</p>
          <Link className="btn btn-primary" href="/urunler">
            Alışverişe başla
          </Link>
        </div>
      ) : (
        <ul className="order-list" data-testid="siparislerim">
          {list.map((o) => {
            const its = byOrder.get(o.id) ?? [];
            return (
              <li key={o.id}>
                <Link href={`/siparis/${o.number}`} className="order-row">
                  <span className="order-thumbs">
                    {its.slice(0, 3).map((i, k) => (i.imageUrl ? <img key={k} src={i.imageUrl} alt="" width={48} height={60} /> : null))}
                  </span>
                  <span className="order-meta">
                    <strong>{o.number}</strong>
                    <span className="muted">
                      {formatDate(o.createdAt, false)} · {its.length} ürün
                    </span>
                  </span>
                  <StatusBadge status={o.status} />
                  <span className="order-total">{formatTL(o.total)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
