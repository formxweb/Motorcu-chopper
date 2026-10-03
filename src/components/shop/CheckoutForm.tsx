'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { placeOrder } from '@/app/actions/checkout';
import { FormMessage, useFormAction } from '../forms';

type Saved = { id: string; title: string; firstName: string; lastName: string; phone: string; city: string; district: string; line: string; zip: string };

type Props = {
  user: { email: string; firstName: string; lastName: string; phone: string } | null;
  saved: Saved[];
  cities: string[];
  contractsHtml: string;
  totalText: string;
  paymentLabel: string;
};

function AddressFields({ prefix, cities, defaults, values }: { prefix: string; cities: string[]; defaults?: Partial<Saved>; values: Record<string, string> }) {
  const v = (k: string, d = '') => values[`${prefix}${k}`] ?? d;
  return (
    <div className="grid-2">
      <label className="field" htmlFor={`${prefix}firstName`}>
        <span>Ad</span>
        <input id={`${prefix}firstName`} name={`${prefix}firstName`} autoComplete="given-name" defaultValue={v('firstName', defaults?.firstName)} required />
      </label>
      <label className="field" htmlFor={`${prefix}lastName`}>
        <span>Soyad</span>
        <input id={`${prefix}lastName`} name={`${prefix}lastName`} autoComplete="family-name" defaultValue={v('lastName', defaults?.lastName)} required />
      </label>
      <label className="field" htmlFor={`${prefix}city`}>
        <span>İl</span>
        <select id={`${prefix}city`} name={`${prefix}city`} defaultValue={v('city')} required autoComplete="address-level1">
          <option value="">Seç</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="field" htmlFor={`${prefix}district`}>
        <span>İlçe</span>
        <input id={`${prefix}district`} name={`${prefix}district`} autoComplete="address-level2" defaultValue={v('district')} required />
      </label>
      <label className="field span-2" htmlFor={`${prefix}line`}>
        <span>Açık adres</span>
        <textarea id={`${prefix}line`} name={`${prefix}line`} rows={2} autoComplete="street-address" placeholder="Mahalle, cadde/sokak, bina ve daire no" defaultValue={v('line')} required />
      </label>
      <label className="field" htmlFor={`${prefix}zip`}>
        <span>Posta kodu (isteğe bağlı)</span>
        <input id={`${prefix}zip`} name={`${prefix}zip`} inputMode="numeric" autoComplete="postal-code" defaultValue={v('zip')} />
      </label>
    </div>
  );
}

export function CheckoutForm({ user, saved, cities, contractsHtml, totalText, paymentLabel }: Props) {
  const { state, pending, onSubmit } = useFormAction(placeOrder);
  const values = state.fields ?? {};
  const [addressId, setAddressId] = useState(values.addressId ?? saved[0]?.id ?? '');
  const [billingSame, setBillingSame] = useState(values.billingSame !== undefined ? values.billingSame === 'on' : true);
  const [billingType, setBillingType] = useState(values.billingType ?? 'individual');
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const openContracts = () => {
    const f = formRef.current;
    const box = contentRef.current;
    if (f && box) {
      const val = (n: string) => ((f.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
      const sel = saved.find((a) => a.id === addressId);
      const name = sel ? `${sel.firstName} ${sel.lastName}` : `${val('s_firstName')} ${val('s_lastName')}`.trim();
      const address = sel ? `${sel.line}, ${sel.district} / ${sel.city}` : [val('s_line'), [val('s_district'), val('s_city')].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
      const map: Record<string, string> = { name, email: user?.email ?? val('email'), phone: val('phone'), address };
      box.querySelectorAll<HTMLElement>('[data-alan]').forEach((el) => {
        const k = el.dataset.alan ?? '';
        if (map[k]) el.textContent = map[k];
      });
    }
    dialogRef.current?.showModal();
  };

  const useNew = !saved.length || addressId === '';

  return (
    <form ref={formRef} className="form checkout-form" onSubmit={onSubmit} noValidate data-testid="odeme-formu">
      <section className="ck-sec">
        <h2>İletişim</h2>
        {user ? (
          <p className="muted">
            Siparişin <strong>{user.email}</strong> hesabına kaydedilecek.
          </p>
        ) : (
          <p className="muted">
            Hesabın var mı? <Link href="/hesap/giris?sonra=/odeme">Giriş yap</Link>. Üye olmadan da sipariş verebilirsin.
          </p>
        )}
        <div className="grid-2">
          {user ? null : (
            <label className="field" htmlFor="email">
              <span>E-posta</span>
              <input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email} required />
            </label>
          )}
          <label className="field" htmlFor="phone">
            <span>Cep telefonu</span>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05xx xxx xx xx" defaultValue={values.phone ?? user?.phone ?? ''} required />
          </label>
        </div>
      </section>

      <section className="ck-sec">
        <h2>Teslimat adresi</h2>
        {saved.length ? (
          <div className="addr-pick" role="radiogroup" aria-label="Kayıtlı adresler">
            {saved.map((a) => (
              <label key={a.id} className={addressId === a.id ? 'addr on' : 'addr'}>
                <input type="radio" name="addressId" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                <span>
                  <strong>{a.title}</strong>
                  <br />
                  {a.firstName} {a.lastName}, {a.line}, {a.district} / {a.city}
                </span>
              </label>
            ))}
            <label className={addressId === '' ? 'addr on' : 'addr'}>
              <input type="radio" name="addressId" value="" checked={addressId === ''} onChange={() => setAddressId('')} />
              <span>
                <strong>Yeni adres</strong>
              </span>
            </label>
          </div>
        ) : null}
        {useNew ? (
          <>
            <AddressFields prefix="s_" cities={cities} values={values} defaults={user ? { firstName: user.firstName, lastName: user.lastName } : undefined} />
            {user ? (
              <div className="grid-2">
                <label className="check">
                  <input type="checkbox" name="saveAddress" defaultChecked />
                  <span>Bu adresi hesabıma kaydet</span>
                </label>
                <label className="field" htmlFor="addressTitle">
                  <span>Adres adı</span>
                  <input id="addressTitle" name="addressTitle" placeholder="Ev, iş…" defaultValue={values.addressTitle} />
                </label>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="ck-sec">
        <h2>Fatura</h2>
        <div className="seg" role="radiogroup" aria-label="Fatura tipi">
          <label className={billingType === 'individual' ? 'on' : ''}>
            <input type="radio" name="billingType" value="individual" checked={billingType === 'individual'} onChange={() => setBillingType('individual')} />
            Bireysel
          </label>
          <label className={billingType === 'corporate' ? 'on' : ''}>
            <input type="radio" name="billingType" value="corporate" checked={billingType === 'corporate'} onChange={() => setBillingType('corporate')} />
            Kurumsal
          </label>
        </div>
        {billingType === 'corporate' ? (
          <div className="grid-2">
            <label className="field span-2" htmlFor="companyName">
              <span>Firma unvanı</span>
              <input id="companyName" name="companyName" defaultValue={values.companyName} />
            </label>
            <label className="field" htmlFor="taxOffice">
              <span>Vergi dairesi</span>
              <input id="taxOffice" name="taxOffice" defaultValue={values.taxOffice} />
            </label>
            <label className="field" htmlFor="taxNumber">
              <span>Vergi numarası</span>
              <input id="taxNumber" name="taxNumber" inputMode="numeric" defaultValue={values.taxNumber} />
            </label>
          </div>
        ) : (
          <label className="field" htmlFor="identityNumber">
            <span>T.C. kimlik no (isteğe bağlı, e-arşiv fatura için)</span>
            <input id="identityNumber" name="identityNumber" inputMode="numeric" maxLength={11} defaultValue={values.identityNumber} />
          </label>
        )}
        <label className="check">
          <input type="checkbox" name="billingSame" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
          <span>Fatura adresim teslimat adresiyle aynı</span>
        </label>
        {!billingSame ? <AddressFields prefix="b_" cities={cities} values={values} /> : null}
      </section>

      <section className="ck-sec">
        <label className="field" htmlFor="note">
          <span>Sipariş notu (isteğe bağlı)</span>
          <textarea id="note" name="note" rows={2} maxLength={500} placeholder="Özel ölçü, teslimat saati gibi notlar" defaultValue={values.note} />
        </label>
      </section>

      <section className="ck-sec ck-agree">
        <label className="check">
          <input type="checkbox" name="agree" defaultChecked={values.agree === 'on'} data-testid="sozlesme-onay" />
          <span>
            <button type="button" className="link-btn" onClick={openContracts}>
              Ön bilgilendirme formunu
            </button>{' '}
            ve{' '}
            <button type="button" className="link-btn" onClick={openContracts}>
              mesafeli satış sözleşmesini
            </button>{' '}
            okudum, onaylıyorum.
          </span>
        </label>
        <p className="small muted">
          Kişisel verilerin <Link href="/sayfa/kvkk" target="_blank">aydınlatma metnine</Link> uygun olarak işlenir.
        </p>
        <FormMessage state={state} testId="odeme-hata" />
        <button type="submit" className="btn btn-primary btn-lg full" disabled={pending} data-testid="odemeye-ilerle">
          {pending ? 'Ödeme sayfası açılıyor…' : `Kartla öde (${totalText})`}
        </button>
        <p className="small muted">Bir sonraki adımda {paymentLabel ? `${paymentLabel} ` : ''}güvenli ödeme sayfasında kart bilgilerini girersin.</p>
      </section>

      <dialog ref={dialogRef} className="contract-dialog" aria-label="Sözleşmeler">
        <div className="contract-head">
          <strong>Ön bilgilendirme formu ve mesafeli satış sözleşmesi</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dialogRef.current?.close()}>
            Kapat
          </button>
        </div>
        <div ref={contentRef} className="contract-body prose" dangerouslySetInnerHTML={{ __html: contractsHtml }} />
      </dialog>
    </form>
  );
}
