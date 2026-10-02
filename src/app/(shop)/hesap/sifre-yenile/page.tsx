import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetForm } from '@/components/shop/AuthForms';

export const metadata: Metadata = { title: 'Yeni şifre', robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const token = typeof sp.t === 'string' ? sp.t : '';
  return (
    <div className="wrap narrow page-pad">
      <h1>Yeni şifre belirle</h1>
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p>
          Bağlantı eksik. <Link href="/hesap/sifremi-unuttum">Yeni bağlantı iste</Link>.
        </p>
      )}
    </div>
  );
}
