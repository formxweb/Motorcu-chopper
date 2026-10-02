import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { changePassword, updateProfile } from '@/app/actions/account';
import { ActionForm } from '@/components/forms';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Üyelik bilgilerim', robots: { index: false } };

export default async function ProfilePage() {
  const me = await requireUser('/hesap/bilgiler');
  const [u] = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
  return (
    <>
      <h1>Üyelik bilgilerim</h1>
      <section className="box">
        <h2>Kişisel bilgiler</h2>
        <ActionForm action={updateProfile} submitLabel="Kaydet">
          <div className="grid-2">
            <label className="field" htmlFor="firstName">
              <span>Ad</span>
              <input id="firstName" name="firstName" defaultValue={u.firstName} />
            </label>
            <label className="field" htmlFor="lastName">
              <span>Soyad</span>
              <input id="lastName" name="lastName" defaultValue={u.lastName} />
            </label>
            <label className="field" htmlFor="email-ro">
              <span>E-posta</span>
              <input id="email-ro" value={u.email} readOnly disabled />
            </label>
            <label className="field" htmlFor="phone">
              <span>Cep telefonu</span>
              <input id="phone" name="phone" type="tel" defaultValue={u.phone} placeholder="05xx xxx xx xx" />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" name="pazarlama" defaultChecked={u.marketingConsent} />
            <span>Kampanya ve yeni ürünlerden e-posta ve SMS ile haberdar olmak istiyorum.</span>
          </label>
        </ActionForm>
      </section>
      <section className="box">
        <h2>Şifre değiştir</h2>
        <ActionForm action={changePassword} submitLabel="Şifreyi değiştir" resetOnSuccess>
          <div className="grid-2">
            <label className="field" htmlFor="current">
              <span>Mevcut şifre</span>
              <input id="current" name="current" type="password" autoComplete="current-password" />
            </label>
            <label className="field" htmlFor="next">
              <span>Yeni şifre (en az 8 karakter)</span>
              <input id="next" name="next" type="password" autoComplete="new-password" />
            </label>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
