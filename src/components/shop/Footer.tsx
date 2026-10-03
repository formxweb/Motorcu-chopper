import Link from 'next/link';
import type { StoreSettings } from '@/lib/settings-defaults';

type Cat = { slug: string; name: string };

export function Footer({ settings, categories, paymentLabel }: { settings: StoreSettings; categories: Cat[]; paymentLabel: string }) {
  const s = settings;
  return (
    <footer className="site-foot">
      <div className="wrap foot-grid">
        <div className="foot-brand">
          <Link href="/" className="brand">
            <span className="brand-name">{s.storeName}</span>
            <span className="brand-sub">{s.tagline}</span>
          </Link>
          <p className="foot-pay">
            Kredi kartı ve banka kartıyla 3D Secure güvenli ödeme.{paymentLabel ? ` Ödeme altyapısı: ${paymentLabel}.` : ''} Taksit seçenekleri ödeme adımında gösterilir.
          </p>
        </div>
        <nav aria-label="Mağaza">
          <h2>Mağaza</h2>
          <Link href="/urunler">Tüm ürünler</Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/urunler?kategori=${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </nav>
        <nav aria-label="Yardım">
          <h2>Yardım</h2>
          <Link href="/siparis-takip">Sipariş takibi</Link>
          <Link href="/beden-tablosu">Beden tablosu</Link>
          <Link href="/sayfa/teslimat-ve-kargo">Teslimat ve kargo</Link>
          <Link href="/sayfa/iade-ve-degisim">İade ve değişim</Link>
          <Link href="/sayfa/iletisim">İletişim</Link>
        </nav>
        <nav aria-label="Yasal">
          <h2>Kurumsal</h2>
          <Link href="/sayfa/hakkimizda">Hakkımızda</Link>
          <Link href="/sayfa/mesafeli-satis-sozlesmesi">Mesafeli satış sözleşmesi</Link>
          <Link href="/sayfa/on-bilgilendirme-formu">Ön bilgilendirme formu</Link>
          <Link href="/sayfa/kvkk">Kişisel verilerin korunması</Link>
          <Link href="/sayfa/gizlilik-ve-cerezler">Gizlilik ve çerezler</Link>
          <Link href="/sayfa/uyelik-kosullari">Üyelik koşulları</Link>
        </nav>
        <div className="foot-contact">
          <h2>İletişim</h2>
          {s.contactPhone ? <p>Telefon ve WhatsApp: <span className="sel">{s.contactPhone}</span></p> : null}
          {s.contactEmail ? <p>E-posta: <span className="sel">{s.contactEmail}</span></p> : null}
          {s.workingHours ? <p>{s.workingHours}</p> : null}
          {s.instagram ? (
            <p>
              <a href={s.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </p>
          ) : null}
        </div>
      </div>
      <div className="wrap foot-legal">
        <p>
          {s.seller.title ? `${s.seller.title}` : s.storeName}
          {s.seller.address ? `, ${s.seller.address}` : ''}
          {s.seller.taxNumber ? `. Vergi no: ${s.seller.taxOffice} ${s.seller.taxNumber}` : ''}
          {s.seller.mersis ? `. MERSİS: ${s.seller.mersis}` : ''}
        </p>
        <p>Fiyatlara KDV dahildir.</p>
      </div>
    </footer>
  );
}
