import Link from 'next/link';
import { Footer } from '@/components/shop/Footer';
import { Header } from '@/components/shop/Header';
import { getCurrentUser } from '@/lib/auth';
import { getCartCount } from '@/lib/cart';
import { activeCategories } from '@/lib/catalog';
import { getPaymentSetup } from '@/lib/payment';
import { getSettings } from '@/lib/settings';

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  let loaded: [Awaited<ReturnType<typeof getSettings>>, Awaited<ReturnType<typeof getCurrentUser>>];
  try {
    loaded = await Promise.all([getSettings(), getCurrentUser()]);
  } catch (e) {
    console.error('[mağaza] veritabanına ulaşılamadı', e);
    return (
      <main className="soon">
        <div className="soon-in">
          <span className="brand-name">Motorcu Chopper</span>
          <h1>Site kısa bir süre için kapalı</h1>
          <p>Çok yakında tekrar buradayız. Sipariş ve sorular için Instagram veya WhatsApp üzerinden yazabilirsiniz.</p>
          <p className="small muted">Site sahibiyseniz: veritabanı bağlantısı kurulamadı. Ayrıntı için /durum adresine bakın.</p>
        </div>
      </main>
    );
  }
  const [settings, user] = loaded;
  const isAdmin = user?.role === 'admin';

  if (!settings.storeOpen && !isAdmin) {
    return (
      <main className="soon">
        <div className="soon-in">
          <span className="brand-name">{settings.storeName}</span>
          <h1>Mağazamız çok yakında açılıyor</h1>
          <p>Deri yelek, kot yelek ve kişiye özel sırt armaları için hazırlık yapıyoruz.</p>
          {settings.contactPhone ? (
            <p>
              Sipariş ve sorular için: <span className="sel">{settings.contactPhone}</span>
            </p>
          ) : null}
          {settings.instagram ? (
            <p>
              <a href={settings.instagram} target="_blank" rel="noopener noreferrer">
                Instagram sayfamız
              </a>
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  const [cartCount, categories, pay] = await Promise.all([getCartCount(), activeCategories(), getPaymentSetup()]);
  const cats = categories.filter((c) => c.count > 0).map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <>
      {isAdmin ? (
        <div className="adminbar">
          <div className="wrap">
            {settings.storeOpen ? 'Yönetici olarak görüntülüyorsun.' : 'Mağaza kapalı. Ziyaretçiler "Yakında" sayfasını görüyor, yalnızca yöneticiler mağazayı görebilir.'}{' '}
            <Link href="/yonetim">Yönetim paneli</Link>
          </div>
        </div>
      ) : null}
      <Header settings={settings} cartCount={cartCount} signedIn={!!user} categories={cats} />
      <main id="icerik" className="site-main">
        {children}
      </main>
      <Footer settings={settings} categories={cats} paymentLabel={pay.label} />
    </>
  );
}
