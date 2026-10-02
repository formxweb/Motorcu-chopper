'use client';

import Link from 'next/link';
import { adminLogin, login, register, requestPasswordReset, resetPassword } from '@/app/actions/auth';
import { FormMessage, useFormAction } from '../forms';

export function LoginForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useFormAction(login);
  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid="giris-formu">
      <input type="hidden" name="sonra" value={next} />
      <label className="field" htmlFor="email">
        <span>E-posta</span>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />
      </label>
      <label className="field" htmlFor="password">
        <span>Şifre</span>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </label>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary btn-lg full" disabled={pending}>
          {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
        <FormMessage state={state} />
      </div>
      <p className="small">
        <Link href="/hesap/sifremi-unuttum">Şifremi unuttum</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { state, pending, onSubmit } = useFormAction(register);
  const f = state.fields ?? {};
  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid="kayit-formu">
      <input type="hidden" name="sonra" value={next} />
      <div className="grid-2">
        <label className="field" htmlFor="firstName">
          <span>Ad</span>
          <input id="firstName" name="firstName" autoComplete="given-name" defaultValue={f.firstName} required />
        </label>
        <label className="field" htmlFor="lastName">
          <span>Soyad</span>
          <input id="lastName" name="lastName" autoComplete="family-name" defaultValue={f.lastName} required />
        </label>
      </div>
      <label className="field" htmlFor="r-email">
        <span>E-posta</span>
        <input id="r-email" name="email" type="email" autoComplete="email" defaultValue={f.email} required />
      </label>
      <label className="field" htmlFor="r-phone">
        <span>Cep telefonu (isteğe bağlı)</span>
        <input id="r-phone" name="phone" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" defaultValue={f.phone} />
      </label>
      <label className="field" htmlFor="r-password">
        <span>Şifre (en az 8 karakter)</span>
        <input id="r-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="check">
        <input type="checkbox" name="kvkk" />
        <span>
          <Link href="/sayfa/uyelik-kosullari" target="_blank">
            Üyelik koşullarını
          </Link>{' '}
          okudum, kabul ediyorum. Kişisel verilerimin{' '}
          <Link href="/sayfa/kvkk" target="_blank">
            aydınlatma metnine
          </Link>{' '}
          uygun işleneceğini biliyorum.
        </span>
      </label>
      <label className="check">
        <input type="checkbox" name="pazarlama" />
        <span>Kampanya ve yeni ürünlerden e-posta ve SMS ile haberdar olmak istiyorum (isteğe bağlı).</span>
      </label>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary btn-lg full" disabled={pending}>
          {pending ? 'Hesap oluşturuluyor…' : 'Üye ol'}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ForgotForm() {
  const { state, pending, onSubmit } = useFormAction(requestPasswordReset);
  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid="sifre-unuttum-formu">
      <label className="field" htmlFor="f-email">
        <span>E-posta</span>
        <input id="f-email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />
      </label>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Gönderiliyor…' : 'Yenileme bağlantısı gönder'}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { state, pending, onSubmit } = useFormAction(resetPassword);
  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid="sifre-yenile-formu">
      <input type="hidden" name="t" value={token} />
      <label className="field" htmlFor="n-password">
        <span>Yeni şifre (en az 8 karakter)</span>
        <input id="n-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function AdminLoginForm() {
  const { state, pending, onSubmit } = useFormAction(adminLogin);
  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid="yonetim-giris">
      <label className="field" htmlFor="a-email">
        <span>E-posta</span>
        <input id="a-email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />
      </label>
      <label className="field" htmlFor="a-password">
        <span>Şifre</span>
        <input id="a-password" name="password" type="password" autoComplete="current-password" required />
      </label>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary full" disabled={pending}>
          {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
