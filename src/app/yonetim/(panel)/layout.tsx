import Link from 'next/link';
import { and, eq, inArray, ne, or } from 'drizzle-orm';
import { logout } from '@/app/actions/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import { db } from '@/db';
import { orders, reviews } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { ACTIONABLE } from '@/lib/status';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [openOrders, pendingReviews] = await Promise.all([
    db.$count(orders, or(inArray(orders.status, ACTIONABLE), and(ne(orders.requestType, ''), ne(orders.status, 'cancelled')))),
    db.$count(reviews, eq(reviews.status, 'pending')),
  ]);
  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Link href="/yonetim" className="adm-brand">
          <span className="brand-name">Motorcu Chopper</span>
          <small>Yönetim</small>
        </Link>
        <AdminNav counts={{ orders: openOrders, reviews: pendingReviews }} />
        <div className="adm-side-foot">
          <Link href="/" target="_blank">
            Mağazayı aç
          </Link>
          <span>{admin.email}</span>
          <form action={logout}>
            <button type="submit" className="link-btn">
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
