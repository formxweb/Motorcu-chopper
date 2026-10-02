import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { requireUser } from '@/lib/auth';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/hesap');
  return (
    <div className="wrap account">
      <aside className="acc-nav" aria-label="Hesap menüsü">
        <p className="acc-hello">
          Merhaba, <strong>{user.firstName || user.email}</strong>
        </p>
        <nav>
          <Link href="/hesap">Siparişlerim</Link>
          <Link href="/hesap/favoriler">Favorilerim</Link>
          <Link href="/hesap/adresler">Adreslerim</Link>
          <Link href="/hesap/bilgiler">Üyelik bilgilerim</Link>
          {user.role === 'admin' ? <Link href="/yonetim">Yönetim paneli</Link> : null}
        </nav>
        <form action={logout}>
          <button type="submit" className="link-btn">
            Çıkış yap
          </button>
        </form>
      </aside>
      <div className="acc-main">{children}</div>
    </div>
  );
}
