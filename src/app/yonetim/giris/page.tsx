import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/shop/AuthForms';
import { getCurrentUser } from '@/lib/auth';

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  if (user?.role === 'admin') redirect('/yonetim');
  return (
    <div className="wrap narrow page-pad" style={{ maxWidth: 420 }}>
      <span className="brand-name" style={{ color: 'var(--brass)' }}>
        Motorcu Chopper
      </span>
      <h1>Yönetim girişi</h1>
      {user ? <p className="msg msg-warn">{user.email} hesabının yönetici yetkisi yok.</p> : null}
      <AdminLoginForm />
      <p className="small muted">
        <Link href="/">Mağazaya dön</Link>
      </p>
    </div>
  );
}
