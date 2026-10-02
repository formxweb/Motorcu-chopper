import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/shop/AuthForms';
import { getCurrentUser } from '@/lib/auth';
import { safeNext } from '@/lib/utils';

export const metadata: Metadata = { title: 'Üye ol', robots: { index: false } };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.sonra === 'string' ? sp.sonra : '', '/hesap');
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="wrap auth">
      <div className="auth-card">
        <h1>Üye ol</h1>
        <RegisterForm next={next} />
      </div>
      <div className="auth-side">
        <h2>Zaten üye misin?</h2>
        <Link className="btn btn-line" href={`/hesap/giris?sonra=${encodeURIComponent(next)}`}>
          Giriş yap
        </Link>
      </div>
    </div>
  );
}
