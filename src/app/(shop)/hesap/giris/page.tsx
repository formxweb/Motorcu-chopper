import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/shop/AuthForms';
import { getCurrentUser } from '@/lib/auth';
import { safeNext } from '@/lib/utils';

export const metadata: Metadata = { title: 'Giriş yap', robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.sonra === 'string' ? sp.sonra : '', '/hesap');
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="wrap auth">
      <div className="auth-card">
        <h1>Giriş yap</h1>
        <LoginForm next={next} />
      </div>
      <div className="auth-side">
        <h2>Hesabın yok mu?</h2>
        <p className="muted">Üye olursan siparişlerini takip eder, adreslerini kaydeder, satın aldığın ürünlere yorum yazabilirsin.</p>
        <Link className="btn btn-line" href={`/hesap/kayit?sonra=${encodeURIComponent(next)}`}>
          Üye ol
        </Link>
        <p className="small muted">
          Üye olmadan verdiğin siparişleri <Link href="/siparis-takip">sipariş takibi</Link> sayfasından görebilirsin.
        </p>
      </div>
    </div>
  );
}
