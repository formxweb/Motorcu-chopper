import type { Metadata } from 'next';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { ProductCard } from '@/components/shop/ProductCard';
import { db } from '@/db';
import { favorites } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { productCardsByIds } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Favorilerim', robots: { index: false } };

export default async function FavoritesPage() {
  const user = await requireUser('/hesap/favoriler');
  const rows = await db.select({ productId: favorites.productId }).from(favorites).where(eq(favorites.userId, user.id)).orderBy(desc(favorites.createdAt));
  const cards = await productCardsByIds(rows.map((r) => r.productId));
  return (
    <>
      <h1>Favorilerim</h1>
      {cards.length ? (
        <div className="grid grid-3" data-testid="favoriler">
          {cards.map((c) => (
            <ProductCard key={c.id} p={c} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>Favori listen boş. Ürün sayfasındaki kalp simgesiyle ekleyebilirsin.</p>
          <Link className="btn btn-line" href="/urunler">
            Ürünlere göz at
          </Link>
        </div>
      )}
    </>
  );
}
