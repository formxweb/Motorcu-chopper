import type { Metadata } from 'next';
import { asc, desc, eq } from 'drizzle-orm';
import { deleteAddress, saveAddress, setDefaultAddress } from '@/app/actions/account';
import { ActionForm, ConfirmButton } from '@/components/forms';
import { db } from '@/db';
import { addresses } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { CITIES } from '@/lib/cities';
import { formatPhone } from '@/lib/format';

export const metadata: Metadata = { title: 'Adreslerim', robots: { index: false } };

type A = typeof addresses.$inferSelect;

function AddressFormFields({ a }: { a?: A }) {
  const p = a ? `e${a.id.slice(0, 6)}-` : 'n-';
  return (
    <div className="grid-2">
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <label className="field" htmlFor={`${p}title`}>
        <span>Adres adı</span>
        <input id={`${p}title`} name="title" defaultValue={a?.title ?? ''} placeholder="Ev, iş…" />
      </label>
      <label className="field" htmlFor={`${p}phone`}>
        <span>Telefon</span>
        <input id={`${p}phone`} name="phone" type="tel" defaultValue={a?.phone ?? ''} placeholder="05xx xxx xx xx" />
      </label>
      <label className="field" htmlFor={`${p}firstName`}>
        <span>Ad</span>
        <input id={`${p}firstName`} name="firstName" defaultValue={a?.firstName ?? ''} />
      </label>
      <label className="field" htmlFor={`${p}lastName`}>
        <span>Soyad</span>
        <input id={`${p}lastName`} name="lastName" defaultValue={a?.lastName ?? ''} />
      </label>
      <label className="field" htmlFor={`${p}city`}>
        <span>İl</span>
        <select id={`${p}city`} name="city" defaultValue={a?.city ?? ''}>
          <option value="">Seç</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field" htmlFor={`${p}district`}>
        <span>İlçe</span>
        <input id={`${p}district`} name="district" defaultValue={a?.district ?? ''} />
      </label>
      <label className="field span-2" htmlFor={`${p}line`}>
        <span>Açık adres</span>
        <textarea id={`${p}line`} name="line" rows={2} defaultValue={a?.line ?? ''} />
      </label>
      <label className="field" htmlFor={`${p}zip`}>
        <span>Posta kodu</span>
        <input id={`${p}zip`} name="zip" defaultValue={a?.zip ?? ''} />
      </label>
    </div>
  );
}

export default async function AddressesPage() {
  const user = await requireUser('/hesap/adresler');
  const list = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
  return (
    <>
      <h1>Adreslerim</h1>
      <div className="addr-list">
        {list.map((a) => (
          <article key={a.id} className="addr-card">
            <h3>
              {a.title} {a.isDefault ? <span className="tag">Varsayılan</span> : null}
            </h3>
            <p>
              {a.firstName} {a.lastName}
              <br />
              {a.line}
              <br />
              {a.district} / {a.city} {a.zip}
              <br />
              {formatPhone(a.phone)}
            </p>
            <div className="row-actions">
              <details className="inline-edit">
                <summary className="btn btn-ghost btn-sm">Düzenle</summary>
                <ActionForm action={saveAddress} submitLabel="Kaydet">
                  <AddressFormFields a={a} />
                </ActionForm>
              </details>
              {!a.isDefault ? (
                <form action={setDefaultAddress.bind(null, a.id)}>
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Varsayılan yap
                  </button>
                </form>
              ) : null}
              <ConfirmButton action={deleteAddress.bind(null, a.id)} label="Sil" confirmLabel="Adresi sil" />
            </div>
          </article>
        ))}
      </div>
      <section className="box">
        <h2>Yeni adres ekle</h2>
        <ActionForm action={saveAddress} submitLabel="Adresi kaydet" resetOnSuccess>
          <AddressFormFields />
        </ActionForm>
      </section>
    </>
  );
}
