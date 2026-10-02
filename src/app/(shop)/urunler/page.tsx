import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/shop/ProductCard';
import { SortSelect } from '@/components/shop/SortSelect';
import { activeCategories, filterOptions, listProducts, PAGE_SIZE } from '@/lib/catalog';

type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? '').trim();
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const kategori = one(sp.kategori);
  const cats = await activeCategories();
  const cat = cats.find((c) => c.slug === kategori);
  return {
    title: cat ? cat.name : 'Tüm ürünler',
    description: cat?.description || 'Deri yelek, kot yelek, kulüp yeleği, sırt arması ve motorcu aksesuarları.',
    alternates: { canonical: cat ? `/urunler?kategori=${cat.slug}` : '/urunler' },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const kategori = one(sp.kategori);
  const renk = one(sp.renk);
  const beden = one(sp.beden);
  const q = one(sp.q).slice(0, 60);
  const siralama = one(sp.siralama);
  const sayfa = Math.max(1, Number.parseInt(one(sp.sayfa) || '1', 10) || 1);

  const [cats, opts, result] = await Promise.all([
    activeCategories(),
    filterOptions(),
    listProducts({ category: kategori || undefined, color: renk || undefined, size: beden || undefined, q: q || undefined, sort: siralama, page: sayfa }),
  ]);
  const cat = cats.find((c) => c.slug === kategori);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string> = { kategori, renk, beden, q, siralama };
    for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/urunler?${s}` : '/urunler';
  };
  const active = [renk && { k: 'renk', v: renk }, beden && { k: 'beden', v: beden }, q && { k: 'q', v: `"${q}"` }].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className="wrap listing">
      <div className="listing-head">
        <nav className="crumbs" aria-label="Konum">
          <Link href="/">Ana sayfa</Link>
          <span aria-hidden>/</span>
          {cat ? <Link href="/urunler">Ürünler</Link> : <span>Ürünler</span>}
          {cat ? (
            <>
              <span aria-hidden>/</span>
              <span>{cat.name}</span>
            </>
          ) : null}
        </nav>
        <h1>{q ? `"${q}" için sonuçlar` : cat ? cat.name : 'Tüm ürünler'}</h1>
        {cat?.description ? <p className="muted">{cat.description}</p> : null}
      </div>

      <div className="listing-body">
        <aside className="filters" aria-label="Filtreler">
          <details open className="filter-box">
            <summary>Filtreler</summary>
            <div className="filter-group">
              <h2>Kategori</h2>
              <Link href={href({ kategori: '', sayfa: '' })} className={!kategori ? 'flink on' : 'flink'}>
                Tümü
              </Link>
              {cats
                .filter((c) => c.count > 0)
                .map((c) => (
                  <Link key={c.slug} href={href({ kategori: c.slug, sayfa: '' })} className={c.slug === kategori ? 'flink on' : 'flink'}>
                    {c.name} <span>{c.count}</span>
                  </Link>
                ))}
            </div>
            {opts.colors.length ? (
              <div className="filter-group">
                <h2>Renk</h2>
                <div className="chips">
                  {opts.colors.map((c) => (
                    <Link key={c} href={href({ renk: c === renk ? '' : c, sayfa: '' })} className={c === renk ? 'chip on' : 'chip'}>
                      {c}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {opts.sizes.length ? (
              <div className="filter-group">
                <h2>Beden</h2>
                <div className="chips">
                  {opts.sizes.map((s) => (
                    <Link key={s} href={href({ beden: s === beden ? '' : s, sayfa: '' })} className={s === beden ? 'chip on' : 'chip'}>
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </details>
        </aside>

        <section className="listing-main" aria-label="Ürünler">
          <div className="listing-bar">
            <p className="muted" data-testid="urun-sayisi">
              {result.total} ürün
            </p>
            {active.length ? (
              <div className="chips">
                {active.map((a) => (
                  <Link key={a.k} href={href({ [a.k]: '', sayfa: '' })} className="chip on" aria-label={`${a.v} filtresini kaldır`}>
                    {a.v} ×
                  </Link>
                ))}
              </div>
            ) : null}
            <form className="sort" action="/urunler">
              {kategori ? <input type="hidden" name="kategori" value={kategori} /> : null}
              {renk ? <input type="hidden" name="renk" value={renk} /> : null}
              {beden ? <input type="hidden" name="beden" value={beden} /> : null}
              {q ? <input type="hidden" name="q" value={q} /> : null}
              <label htmlFor="siralama">Sırala</label>
              <SortSelect value={siralama} />
            </form>
          </div>

          {result.items.length ? (
            <div className="grid">
              {result.items.map((p, i) => (
                <ProductCard key={p.id} p={p} priority={i < 4} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <p>Bu filtrelere uyan ürün yok.</p>
              <Link className="btn btn-line" href="/urunler">
                Filtreleri temizle
              </Link>
            </div>
          )}

          {pages > 1 ? (
            <nav className="pager" aria-label="Sayfalar">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={href({ sayfa: n === 1 ? '' : String(n) })} className={n === sayfa ? 'on' : ''} aria-current={n === sayfa ? 'page' : undefined}>
                  {n}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
