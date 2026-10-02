import Link from 'next/link';
import type { StoreSettings } from '@/lib/settings-defaults';
import { IconBag, IconHeart, IconMenu, IconSearch, IconUser } from '../icons';

type Cat = { slug: string; name: string };

export function Header({ settings, cartCount, signedIn, categories }: { settings: StoreSettings; cartCount: number; signedIn: boolean; categories: Cat[] }) {
  return (
    <header className="site-head">
      {settings.announcement ? (
        <div className="announce">
          <div className="wrap">{settings.announcement}</div>
        </div>
      ) : null}
      <div className="head-main wrap">
        <details className="mnav">
          <summary aria-label="Menüyü aç">
            <IconMenu />
          </summary>
          <nav className="mnav-panel" aria-label="Mobil menü">
            <Link href="/urunler">Tüm ürünler</Link>
            {categories.map((c) => (
              <Link key={c.slug} href={`/urunler?kategori=${c.slug}`}>
                {c.name}
              </Link>
            ))}
            <hr />
            <Link href="/siparis-takip">Sipariş takibi</Link>
            <Link href="/beden-tablosu">Beden tablosu</Link>
            <Link href={signedIn ? '/hesap' : '/hesap/giris'}>{signedIn ? 'Hesabım' : 'Giriş yap'}</Link>
          </nav>
        </details>
        <Link href="/" className="brand" aria-label={`${settings.storeName} ana sayfa`}>
          <span className="brand-name">{settings.storeName}</span>
          <span className="brand-sub">{settings.tagline}</span>
        </Link>
        <nav className="head-nav" aria-label="Kategoriler">
          {categories.map((c) => (
            <Link key={c.slug} href={`/urunler?kategori=${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
        <form action="/urunler" className="head-search" role="search">
          <input name="q" type="search" placeholder="Ürün ara" aria-label="Ürün ara" />
          <button type="submit" aria-label="Ara">
            <IconSearch size={20} />
          </button>
        </form>
        <div className="head-icons">
          <Link href={signedIn ? '/hesap' : '/hesap/giris'} aria-label={signedIn ? 'Hesabım' : 'Giriş yap'} className="icon-link">
            <IconUser />
          </Link>
          <Link href="/hesap/favoriler" aria-label="Favorilerim" className="icon-link hide-sm">
            <IconHeart />
          </Link>
          <Link href="/sepet" className="icon-link cart-link" aria-label={`Sepet, ${cartCount} ürün`} data-testid="sepet-bagi">
            <IconBag />
            {cartCount > 0 ? <b data-testid="sepet-adet">{cartCount}</b> : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
