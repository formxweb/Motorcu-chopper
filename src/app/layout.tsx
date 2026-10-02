import type { Metadata, Viewport } from 'next';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '../../node_modules/@fontsource/big-shoulders-display/700.css';
import '../../node_modules/@fontsource/big-shoulders-display/800.css';
import '../../node_modules/@fontsource/big-shoulders-display/900.css';
import '@fontsource/pirata-one/400.css';
import './globals.css';
import { appUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'Motorcu Chopper | Deri yelek, kulüp yeleği ve sırt arması', template: '%s | Motorcu Chopper' },
  description: 'Motorcu deri yelek, kot yelek, kulüp yeleği ve kişiye özel sırt arması. Kartla güvenli ödeme, hızlı kargo.',
  openGraph: { type: 'website', locale: 'tr_TR', siteName: 'Motorcu Chopper', images: ['/ornek/paylasim.webp'] },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#17110e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
