import { asc, eq } from 'drizzle-orm';
import { addAdmin, removeAdmin, saveShopierSettings, saveStoreSettings } from '@/app/actions/admin-settings';
import { ActionForm, ConfirmButton } from '@/components/forms';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { appUrl, iyzicoConfig, iyzicoReady, smtpReady, storageMode } from '@/lib/env';
import { kurusToInput } from '@/lib/money';
import { getPaymentSetup, getShopierConfig, shopierCallbackPath } from '@/lib/payment';
import { getSettings } from '@/lib/settings';

export default async function SettingsPage() {
  const me = await requireAdmin();
  const [s, admins, shopier, pay] = await Promise.all([
    getSettings(),
    db.select().from(users).where(eq(users.role, 'admin')).orderBy(asc(users.createdAt)),
    getShopierConfig(),
    getPaymentSetup(),
  ]);
  const iz = iyzicoConfig();
  const callbackUrl = `${appUrl()}${shopierCallbackPath()}`;

  return (
    <>
      <div className="adm-top">
        <h1>Ayarlar</h1>
      </div>
      <div className="cols">
        <div>
          <section className="panel">
            <h2>Mağaza</h2>
            <ActionForm action={saveStoreSettings} submitLabel="Kaydet" testId="ayar-magaza">
              <input type="hidden" name="section" value="magaza" />
              <label className="check">
                <input type="checkbox" name="storeOpen" defaultChecked={s.storeOpen} data-testid="magaza-acik" />
                <span>
                  <strong>Mağaza ziyaretçilere açık</strong> (kapalıyken ziyaretçiler &quot;Yakında&quot; sayfasını görür)
                </span>
              </label>
              <div className="grid-2">
                <label className="field" htmlFor="storeName">
                  <span>Mağaza adı</span>
                  <input id="storeName" name="storeName" defaultValue={s.storeName} />
                </label>
                <label className="field" htmlFor="tagline">
                  <span>Alt başlık</span>
                  <input id="tagline" name="tagline" defaultValue={s.tagline} />
                </label>
                <label className="field span-2" htmlFor="announcement">
                  <span>Duyuru şeridi (boş bırakılırsa gizlenir)</span>
                  <input id="announcement" name="announcement" defaultValue={s.announcement} />
                </label>
                <label className="field" htmlFor="contactPhone">
                  <span>Telefon</span>
                  <input id="contactPhone" name="contactPhone" defaultValue={s.contactPhone} />
                </label>
                <label className="field" htmlFor="contactEmail">
                  <span>İletişim e-postası</span>
                  <input id="contactEmail" name="contactEmail" type="email" defaultValue={s.contactEmail} />
                </label>
                <label className="field" htmlFor="whatsapp">
                  <span>WhatsApp numarası (90 ile)</span>
                  <input id="whatsapp" name="whatsapp" defaultValue={s.whatsapp} />
                </label>
                <label className="field" htmlFor="instagram">
                  <span>Instagram adresi</span>
                  <input id="instagram" name="instagram" defaultValue={s.instagram} />
                </label>
                <label className="field" htmlFor="workingHours">
                  <span>Çalışma saatleri</span>
                  <input id="workingHours" name="workingHours" defaultValue={s.workingHours} />
                </label>
                <label className="field" htmlFor="notifyEmail">
                  <span>Yeni sipariş bildirimi gidecek e-posta</span>
                  <input id="notifyEmail" name="notifyEmail" type="email" defaultValue={s.notifyEmail} placeholder={s.contactEmail || 'siparis@...'} />
                </label>
              </div>
            </ActionForm>
          </section>

          <section className="panel">
            <h2>Satıcı bilgileri</h2>
            <p className="hint">Mesafeli satış sözleşmesi, ön bilgilendirme formu ve site altbilgisinde görünür. Yasal olarak zorunludur.</p>
            <ActionForm action={saveStoreSettings} submitLabel="Kaydet" testId="ayar-satici">
              <input type="hidden" name="section" value="satici" />
              <div className="grid-2">
                <label className="field span-2" htmlFor="title">
                  <span>Unvan (şahıs şirketinde ad soyad)</span>
                  <input id="title" name="title" defaultValue={s.seller.title} />
                </label>
                <label className="field span-2" htmlFor="address">
                  <span>Adres</span>
                  <input id="address" name="address" defaultValue={s.seller.address} />
                </label>
                <label className="field" htmlFor="taxOffice">
                  <span>Vergi dairesi</span>
                  <input id="taxOffice" name="taxOffice" defaultValue={s.seller.taxOffice} />
                </label>
                <label className="field" htmlFor="taxNumber">
                  <span>Vergi numarası</span>
                  <input id="taxNumber" name="taxNumber" defaultValue={s.seller.taxNumber} />
                </label>
                <label className="field" htmlFor="mersis">
                  <span>MERSİS no (varsa)</span>
                  <input id="mersis" name="mersis" defaultValue={s.seller.mersis} />
                </label>
                <label className="field" htmlFor="kep">
                  <span>KEP adresi (varsa)</span>
                  <input id="kep" name="kep" defaultValue={s.seller.kep} />
                </label>
              </div>
            </ActionForm>
          </section>

          <section className="panel">
            <h2>Kargo ve iade</h2>
            <ActionForm action={saveStoreSettings} submitLabel="Kaydet">
              <input type="hidden" name="section" value="kargo" />
              <div className="grid-2">
                <label className="field" htmlFor="shippingFee">
                  <span>Kargo ücreti (TL)</span>
                  <input id="shippingFee" name="shippingFee" inputMode="decimal" defaultValue={kurusToInput(s.shippingFee)} />
                </label>
                <label className="field" htmlFor="freeShippingThreshold">
                  <span>Ücretsiz kargo sınırı (TL, 0 = yok)</span>
                  <input id="freeShippingThreshold" name="freeShippingThreshold" inputMode="decimal" defaultValue={kurusToInput(s.freeShippingThreshold)} />
                </label>
                <label className="field" htmlFor="shipDays">
                  <span>Stoktaki ürün kargoya verilme süresi</span>
                  <input id="shipDays" name="shipDays" defaultValue={s.shipDays} />
                </label>
                <label className="field" htmlFor="personalizedDays">
                  <span>Kişiye özel ürün hazırlama süresi</span>
                  <input id="personalizedDays" name="personalizedDays" defaultValue={s.personalizedDays} />
                </label>
                <label className="field" htmlFor="returnDays">
                  <span>İade süresi (gün, en az 14)</span>
                  <input id="returnDays" name="returnDays" inputMode="numeric" defaultValue={s.returnDays} />
                </label>
              </div>
            </ActionForm>
          </section>

          <section className="panel">
            <h2>Kargo firmaları</h2>
            <p className="hint">Her satıra bir firma: Ad | takip adresi. Adreste takip numarasının geleceği yere {'{kod}'} yaz.</p>
            <ActionForm action={saveStoreSettings} submitLabel="Kaydet">
              <input type="hidden" name="section" value="kargo-firmalari" />
              <label className="field" htmlFor="carriers">
                <span>Firmalar</span>
                <textarea id="carriers" name="carriers" rows={7} defaultValue={s.carriers.map((c) => `${c.name} | ${c.url}`).join('\n')} />
              </label>
            </ActionForm>
          </section>
        </div>

        <div>
          <section className="panel" id="shopier">
            <h2>Shopier ile kartla ödeme</h2>
            <dl className="kv">
              <dt>Kullanılan ödeme altyapısı</dt>
              <dd data-testid="odeme-altyapisi">{pay.ready ? pay.label + (pay.testMode ? ' (test modu)' : '') : 'Yok, ödeme kapalı'}</dd>
              <dt>Shopier</dt>
              <dd>{shopier.source === 'env' ? 'Bağlı (Vercel ortam değişkenleri)' : shopier.source === 'panel' ? 'Bağlı' : 'Bağlı değil'}</dd>
              <dt>Geri dönüş adresi</dt>
              <dd className="sel" data-testid="shopier-geri-donus">{callbackUrl}</dd>
            </dl>
            <ol className="hint setup-steps">
              <li>shopier.com&apos;da satıcı hesabı aç (bireysel hesap da olur) ve hesabını onaylat.</li>
              <li>
                Shopier panelinde <strong>Entegrasyonlar → Modül Yönetimi → Modül Ayarları</strong> sayfasını aç.
              </li>
              <li>
                <strong>Kayıtlı Alan Adları</strong> kısmına <span className="sel">{appUrl()}</span> adresini, <strong>Geri Dönüş URL</strong> kısmına yukarıdaki geri dönüş adresini ekle.
              </li>
              <li>Aynı sayfadaki API kullanıcı ve API şifreyi aşağıya yapıştırıp kaydet.</li>
            </ol>
            {shopier.source === 'env' ? (
              <p className="hint">Anahtarlar Vercel ortam değişkenlerinden geliyor (SHOPIER_API_KEY, SHOPIER_API_SECRET).</p>
            ) : (
              <ActionForm action={saveShopierSettings} submitLabel="Kaydet" testId="ayar-shopier">
                <label className="field" htmlFor="shopierApiKey">
                  <span>API kullanıcı</span>
                  <input id="shopierApiKey" name="shopierApiKey" defaultValue={shopier.apiKey} autoComplete="off" spellCheck={false} />
                </label>
                <label className="field" htmlFor="shopierApiSecret">
                  <span>API şifre</span>
                  <input
                    id="shopierApiSecret"
                    name="shopierApiSecret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={shopier.apiSecret ? 'Kayıtlı. Değiştirmek için yenisini yaz.' : ''}
                  />
                </label>
                <label className="field" htmlFor="shopierWebsiteIndex">
                  <span>Geri dönüş adresinin sırası (Shopier&apos;de kaçıncı satırda)</span>
                  <select id="shopierWebsiteIndex" name="shopierWebsiteIndex" defaultValue={String(shopier.websiteIndex)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}. satır
                      </option>
                    ))}
                  </select>
                </label>
                {shopier.source === 'panel' ? (
                  <button type="submit" name="shopierRemove" value="1" className="btn btn-ghost btn-sm inline-start" data-testid="shopier-kaldir">
                    Shopier bağlantısını kaldır
                  </button>
                ) : null}
              </ActionForm>
            )}
            <p className="hint">Shopier&apos;de deneme modu yok. Bağladıktan sonra kendi kartınla küçük bir sipariş verip panelden iptal ederek dene. İadeler Shopier panelinden yapılır, sitede yalnızca kaydı tutulur.</p>
          </section>

          <section className="panel">
            <h2>Ödeme ve altyapı</h2>
            <dl className="kv">
              <dt>iyzico</dt>
              <dd>{iyzicoReady() ? (iz.sandbox ? 'Test modu (sandbox)' : 'Canlı') : 'Anahtar yok'}</dd>
              <dt>API adresi</dt>
              <dd>{iz.baseUrl}</dd>
              <dt>Bildirim adresi</dt>
              <dd className="sel">{appUrl()}/api/odeme/iyzico/webhook</dd>
              <dt>E-posta</dt>
              <dd>{smtpReady() ? 'SMTP ayarlı' : 'Ayarlı değil'}</dd>
              <dt>Görsel depolama</dt>
              <dd>{storageMode() === 'supabase' ? 'Supabase Storage' : storageMode() === 'local' ? 'Yerel klasör (yalnızca geliştirme)' : 'Veritabanı'}</dd>
              <dt>Site adresi</dt>
              <dd>{appUrl()}</dd>
            </dl>
            <p className="hint">Bu değerler Vercel &gt; Settings &gt; Environment Variables bölümünden değiştirilir. iyzico kullanıyorsan bildirim adresini iyzico panelinde Ayarlar &gt; Bildirimler kısmına gir. Shopier bağlıysa ödemeler Shopier ile alınır.</p>
          </section>

          <section className="panel">
            <h2>Yöneticiler</h2>
            <ul className="check-list">
              {admins.map((a) => (
                <li key={a.id} className="ok">
                  <span>
                    {a.email} {a.id === me.id ? <small>sen</small> : <ConfirmButton action={removeAdmin.bind(null, a.id)} label="Yetkiyi kaldır" confirmLabel="Yöneticilikten çıkar" />}
                  </span>
                </li>
              ))}
            </ul>
            <ActionForm action={addAdmin} submitLabel="Yönetici ekle" resetOnSuccess>
              <label className="field" htmlFor="adm-email">
                <span>E-posta</span>
                <input id="adm-email" name="email" type="email" />
              </label>
              <label className="field" htmlFor="adm-pass">
                <span>Şifre (yeni hesap için, en az 10 karakter)</span>
                <input id="adm-pass" name="password" type="password" autoComplete="new-password" />
              </label>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
