import Link from 'next/link';
import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { toggleProductActive } from '@/app/actions/admin-catalog';
import { db } from '@/db';
import { categories, products, variants } from '@/db/schema';
import { imagesByProduct, pickImage } from '@/lib/cart';
import { formatTL } from '@/lib/money';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 60) : '';
  const kat = typeof sp.kategori === 'string' ? sp.kategori : '';
  const conds: SQL[] = [];
  if (q) conds.push(ilike(products.name, `%${q.replace(/[%_]/g, '')}%`));
  if (kat) conds.push(eq(products.categoryId, kat));
  const [list, cats] = await Promise.all([
    db
      .select({ p: products, cat: categories.name })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(products.sortOrder), desc(products.createdAt)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  const ids = list.map((r) => r.p.id);
  const [imgs, stocks] = await Promise.all([
    imagesByProduct(ids),
    ids.length
      ? db
          .select({ productId: variants.productId, stock: sql<number>`coalesce(sum(${variants.stock}), 0)`.mapWith(Number), n: sql<number>`count(*)`.mapWith(Number) })
          .from(variants)
          .where(inArray(variants.productId, ids))
          .groupBy(variants.productId)
      : Promise.resolve([] as { productId: string; stock: number; n: number }[]),
  ]);
  const stockMap = new Map(stocks.map((s) => [s.productId, s]));

  return (
    <>
      <div className="adm-top">
        <h1>Ürünler</h1>
        <div className="adm-top-actions">
          <form className="searchbar" action="/yonetim/urunler">
            <select name="kategori" defaultValue={kat} aria-label="Kategori">
              <option value="">Tüm kategoriler</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="q" defaultValue={q} placeholder="Ürün adı" aria-label="Ürün ara" />
            <button type="submit" className="btn btn-ghost btn-sm">
              Ara
            </button>
          </form>
          <Link className="btn btn-primary btn-sm" href="/yonetim/urunler/yeni">
            Yeni ürün
          </Link>
        </div>
      </div>
      <section className="panel">
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl" data-testid="urun-tablosu">
              <thead>
                <tr>
                  <th />
                  <th>Ürün</th>
                  <th>Kategori</th>
                  <th className="num">Fiyat</th>
                  <th className="num">Stok</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ p, cat }) => {
                  const img = pickImage(imgs.get(p.id), p.colors[0]?.name ?? '');
                  const st = stockMap.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td>{img.thumbUrl ? <img src={img.thumbUrl} alt="" width={44} height={55} /> : null}</td>
                      <td>
                        <Link href={`/yonetim/urunler/${p.id}`}>{p.name}</Link>
                        <div className="muted">
                          {p.isFeatured ? 'Öne çıkan · ' : ''}
                          {p.isPersonalized ? 'Kişiye özel · ' : ''}
                          {st?.n ?? 0} seçenek
                        </div>
                      </td>
                      <td>{cat ?? <span className="muted">Yok</span>}</td>
                      <td className="num">{formatTL(p.price)}</td>
                      <td className="num">{p.trackStock ? (st?.stock ?? 0) : <span className="muted">Takip yok</span>}</td>
                      <td>
                        <form action={toggleProductActive.bind(null, p.id)}>
                          <button type="submit" className={p.isActive ? 'status status-done' : 'status status-off'} style={{ background: 'none', cursor: 'pointer' }} title="Durumu değiştir">
                            {p.isActive ? 'Satışta' : 'Gizli'}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Ürün yok.</p>
        )}
      </section>
    </>
  );
}
