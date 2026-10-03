import { desc } from 'drizzle-orm';
import { deleteCoupon, saveCoupon, toggleCoupon } from '@/app/actions/admin-catalog';
import { ActionForm, ConfirmButton } from '@/components/forms';
import { db } from '@/db';
import { discountCodes } from '@/db/schema';
import { formatDate } from '@/lib/format';
import { formatTL } from '@/lib/money';
import { requireAdmin } from '@/lib/auth';

export default async function CouponsPage() {
  await requireAdmin();
  const list = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
  return (
    <>
      <div className="adm-top">
        <h1>İndirim kodları</h1>
      </div>
      <div className="cols">
        <div>
          <section className="panel">
            {list.length ? (
              <div className="tbl-wrap">
                <table className="tbl" data-testid="kupon-tablosu">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>İndirim</th>
                      <th>Koşul</th>
                      <th className="num">Kullanım</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong className="sel">{c.code}</strong>
                        </td>
                        <td>{c.type === 'percent' ? `%${c.value}` : formatTL(c.value)}</td>
                        <td className="muted">
                          {c.minSubtotal ? `${formatTL(c.minSubtotal)} üzeri` : 'Koşulsuz'}
                          {c.endsAt ? `, ${formatDate(c.endsAt, false)} tarihine kadar` : ''}
                        </td>
                        <td className="num">
                          {c.usedCount}
                          {c.maxUses ? ` / ${c.maxUses}` : ''}
                        </td>
                        <td>
                          <form action={toggleCoupon.bind(null, c.id)}>
                            <button type="submit" className={c.isActive ? 'status status-done' : 'status status-off'} style={{ background: 'none', cursor: 'pointer' }}>
                              {c.isActive ? 'Aktif' : 'Kapalı'}
                            </button>
                          </form>
                        </td>
                        <td>
                          <ConfirmButton action={deleteCoupon.bind(null, c.id)} label="Sil" confirmLabel="Kodu sil" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Henüz indirim kodu yok.</p>
            )}
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Yeni kod</h2>
            <ActionForm action={saveCoupon} submitLabel="Kodu oluştur" resetOnSuccess testId="kupon-formu">
              <label className="field" htmlFor="code">
                <span>Kod</span>
                <input id="code" name="code" placeholder="HOSGELDIN10" autoCapitalize="characters" />
              </label>
              <div className="grid-2">
                <label className="field" htmlFor="type">
                  <span>Tür</span>
                  <select id="type" name="type" defaultValue="percent">
                    <option value="percent">Yüzde (%)</option>
                    <option value="fixed">Tutar (TL)</option>
                  </select>
                </label>
                <label className="field" htmlFor="value">
                  <span>Değer</span>
                  <input id="value" name="value" inputMode="decimal" placeholder="10" />
                </label>
                <label className="field" htmlFor="minSubtotal">
                  <span>En az sepet tutarı (TL)</span>
                  <input id="minSubtotal" name="minSubtotal" inputMode="decimal" placeholder="0" />
                </label>
                <label className="field" htmlFor="maxUses">
                  <span>Toplam kullanım sınırı</span>
                  <input id="maxUses" name="maxUses" inputMode="numeric" placeholder="Sınırsız" />
                </label>
                <label className="field" htmlFor="startsAt">
                  <span>Başlangıç</span>
                  <input id="startsAt" name="startsAt" type="date" />
                </label>
                <label className="field" htmlFor="endsAt">
                  <span>Bitiş</span>
                  <input id="endsAt" name="endsAt" type="date" />
                </label>
              </div>
            </ActionForm>
          </section>
        </div>
      </div>
    </>
  );
}
