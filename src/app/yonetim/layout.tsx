import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = { title: { default: 'Yönetim', template: '%s | Yönetim' }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}
