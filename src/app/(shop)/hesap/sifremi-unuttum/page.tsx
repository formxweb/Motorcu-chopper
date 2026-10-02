import type { Metadata } from 'next';
import { ForgotForm } from '@/components/shop/AuthForms';

export const metadata: Metadata = { title: 'Şifremi unuttum', robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="wrap narrow page-pad">
      <h1>Şifremi unuttum</h1>
      <p className="muted">Üye olduğun e-posta adresini yaz, şifre yenileme bağlantısı gönderelim.</p>
      <ForgotForm />
    </div>
  );
}
