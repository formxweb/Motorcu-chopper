import Link from 'next/link';
import { IconNeedle, IconReturn, IconShield, IconTruck } from '@/components/icons';
import { ProductCard } from '@/components/shop/ProductCard';
import { activeCategories, listProducts } from '@/lib/catalog';
import { formatTL } from '@/lib/money';
import { getSettings } from '@/lib/settings';

export default async function HomePage() {
  const [settings, cats] = await Promise.all([getSettings(), activeCategories()]);
  const visibleCats = cats.filter((c) => c.count > 0);
  const [featured, tiles, personal] = await Promise.all([
    listProducts({ featuredOnly: true, limit: 8 }).then(async (r) => (r.items.length ? r : listProducts({ limit: 8 }))),
    Promise.all(visibleCats.map(async (c) => ({ cat: c, first: (await listProducts({ category: c.slug, limit: 1 })).items[0] }))),
    listProducts({ personalizedOnly: true, limit: 1 }),
  ]);
  const personalProduct = personal.items[0];

  return (
    <>
      <section className="hero wrap">
        <div className="hero-text">
          <h1>Kulüp yeleği, deri yelek ve sırt arması</h1>
          <p className="lead">Kalın büyükbaş deri ve 14 oz kot yelekler. Kulübünün adını sırtına nakışla işliyor, yeleğine dikip gönderiyoruz.</p>
          <div className="cta-row">
            <Link className="btn btn-primary btn-lg" href="/urunler">
              Ürünleri gör
            </Link>
            {personalProduct ? (
              <Link className="btn btn-line btn-lg" href={`/urun/${personalProduct.slug}`}>
                Sırt armanı sipariş et
              </Link>
            ) : null}
          </div>
        </div>
        <div className="hero-art">
          <img src="/ornek/hero.webp" alt="Sırtında üst rocker, orta arma ve alt rocker dikili siyah deri kulüp yeleği" width={1200} height={1400} />
        </div>
      </section>

      <section className="trust wrap" aria-label="Alışveriş güvencesi">
        <div>
          <IconShield />
          <p>
            <strong>Kartla güvenli ödeme</strong>
            <span>3D Secure, taksit seçenekleri</span>
          </p>
        </div>
        <div>
          <IconTruck />
          <p>
            <strong>{settings.shipDays} içinde kargoda</strong>
            <span>{settings.freeShippingThreshold > 0 ? `${formatTL(settings.freeShippingThreshold)} üzeri kargo ücretsiz` : 'Türkiye geneli gönderim'}</span>
          </p>
        </div>
        <div>
          <IconReturn />
          <p>
            <strong>{settings.returnDays} gün içinde iade</strong>
            <span>Kişiye özel ürünler hariç</span>
          </p>
        </div>
        <div>
          <IconNeedle />
          <p>
            <strong>Nakışlı arma</strong>
            <span>{settings.personalizedDays} içinde hazır</span>
          </p>
        </div>
      </section>

      {tiles.length ? (
        <section className="wrap sec" aria-labelledby="kat-h">
          <h2 id="kat-h" className="sec-title">
            Kategoriler
          </h2>
          <div className="tiles">
            {tiles.map(({ cat, first }) => (
              <Link key={cat.slug} href={`/urunler?kategori=${cat.slug}`} className="tile">
                {first?.thumbUrl ? <img src={first.thumbUrl} alt="" width={600} height={750} loading="lazy" /> : null}
                <span className="tile-label">
                  <span className="tile-name">{cat.name}</span>
                  <span className="tile-count">{cat.count} ürün</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wrap sec" aria-labelledby="one-cikan-h">
        <div className="sec-head">
          <h2 id="one-cikan-h" className="sec-title">
            Öne çıkanlar
          </h2>
          <Link href="/urunler" className="more">
            Tüm ürünler
          </Link>
        </div>
        <div className="grid">
          {featured.items.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 4} />
          ))}
        </div>
      </section>

      {personalProduct ? (
        <section className="wrap sec" aria-labelledby="arma-h">
          <div className="stitch-band">
            <div className="stitch-text">
              <h2 id="arma-h">Kulübünün adı sırtında</h2>
              <p>Üst rocker, orta arma ve alt rocker seti. Yazını sen yazıyorsun, nakış makinesinde işleyip yeleğine dikiyoruz.</p>
              <ol className="steps">
                <li>
                  <strong>Yazını yaz</strong> Üst ve alt rocker yazısını, renk ve yazı tipini ürün sayfasında seç.
                </li>
                <li>
                  <strong>Nakışta işlenir</strong> Armalar {settings.personalizedDays} içinde hazırlanır.
                </li>
                <li>
                  <strong>Yeleğine dikilir</strong> Bizden yelek alırsan dikim ücretsiz, kargoya dikili hâlde verilir.
                </li>
              </ol>
              <Link className="btn btn-primary" href={`/urun/${personalProduct.slug}`}>
                Rocker setini incele
              </Link>
            </div>
            <div className="stitch-art">
              {personalProduct.thumbUrl ? <img src={personalProduct.imageUrl || personalProduct.thumbUrl} alt={personalProduct.name} width={800} height={1000} loading="lazy" /> : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
