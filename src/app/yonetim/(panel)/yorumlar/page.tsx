import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { deleteReview, setReviewStatus } from '@/app/actions/admin-catalog';
import { ConfirmButton } from '@/components/forms';
import { db } from '@/db';
import { products, reviews, users } from '@/db/schema';
import { formatDate } from '@/lib/format';
import { requireAdmin } from '@/lib/auth';

export default async function ReviewsPage() {
  await requireAdmin();
  const list = await db
    .select({ r: reviews, product: products.name, slug: products.slug, email: users.email })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(users, eq(users.id, reviews.userId))
    .orderBy(desc(reviews.createdAt))
    .limit(200);
  const pending = list.filter((x) => x.r.status === 'pending');
  const rest = list.filter((x) => x.r.status !== 'pending');
  const Row = ({ x }: { x: (typeof list)[number] }) => (
    <article className="op" data-testid="yorum">
      <p>
        <strong>{'★'.repeat(x.r.rating)}</strong>
        <span className="muted">{'★'.repeat(5 - x.r.rating)}</span> · <Link href={`/urun/${x.slug}`}>{x.product}</Link> · {x.r.authorName} ({x.email}) ·{' '}
        <span className="muted">{formatDate(x.r.createdAt)}</span>
      </p>
      <p>{x.r.body}</p>
      <div className="row">
        {x.r.status !== 'approved' ? (
          <form action={setReviewStatus.bind(null, x.r.id, 'approved')}>
            <button type="submit" className="btn btn-primary btn-sm">
              Yayınla
            </button>
          </form>
        ) : null}
        {x.r.status !== 'rejected' ? (
          <form action={setReviewStatus.bind(null, x.r.id, 'rejected')}>
            <button type="submit" className="btn btn-ghost btn-sm">
              {x.r.status === 'approved' ? 'Yayından kaldır' : 'Reddet'}
            </button>
          </form>
        ) : null}
        <ConfirmButton action={deleteReview.bind(null, x.r.id)} label="Sil" confirmLabel="Yorumu sil" />
      </div>
    </article>
  );
  return (
    <>
      <div className="adm-top">
        <h1>Yorumlar</h1>
      </div>
      <section className="panel">
        <h2>Onay bekleyen ({pending.length})</h2>
        {pending.length ? pending.map((x) => <Row key={x.r.id} x={x} />) : <p className="muted">Onay bekleyen yorum yok.</p>}
      </section>
      <section className="panel">
        <h2>Diğer yorumlar</h2>
        {rest.length ? rest.map((x) => <Row key={x.r.id} x={x} />) : <p className="muted">Yorum yok.</p>}
      </section>
    </>
  );
}
