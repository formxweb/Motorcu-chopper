'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/yonetim', label: 'Özet', key: '' },
  { href: '/yonetim/siparisler', label: 'Siparişler', key: 'orders' },
  { href: '/yonetim/urunler', label: 'Ürünler', key: '' },
  { href: '/yonetim/kategoriler', label: 'Kategoriler', key: '' },
  { href: '/yonetim/kuponlar', label: 'İndirim kodları', key: '' },
  { href: '/yonetim/musteriler', label: 'Müşteriler', key: '' },
  { href: '/yonetim/yorumlar', label: 'Yorumlar', key: 'reviews' },
  { href: '/yonetim/e-postalar', label: 'E-postalar', key: '' },
  { href: '/yonetim/ayarlar', label: 'Ayarlar', key: '' },
];

export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Yönetim menüsü">
      {LINKS.map((l) => {
        const on = l.href === '/yonetim' ? path === '/yonetim' : path.startsWith(l.href);
        const n = l.key ? counts[l.key] ?? 0 : 0;
        return (
          <Link key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            {l.label}
            {n > 0 ? <b>{n}</b> : null}
          </Link>
        );
      })}
    </nav>
  );
}
