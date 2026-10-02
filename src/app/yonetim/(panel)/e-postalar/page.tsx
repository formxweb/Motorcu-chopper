import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { emailLog } from '@/db/schema';
import { smtpReady } from '@/lib/env';
import { formatShortDate } from '@/lib/format';

const LABEL = { sent: 'Gönderildi', failed: 'Gönderilemedi', not_configured: 'SMTP yok, gönderilmedi' } as const;

export default async function EmailsPage() {
  const list = await db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(150);
  return (
    <>
      <div className="adm-top">
        <h1>E-postalar</h1>
      </div>
      {!smtpReady() ? (
        <div className="alert">
          E-posta sunucusu (SMTP) ayarlanmadığı için müşterilere e-posta gitmiyor; e-postalar yalnızca burada kayıt altında. Kurulum rehberindeki SMTP adımını tamamla.
        </div>
      ) : null}
      <section className="panel">
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl" data-testid="eposta-tablosu">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Alıcı</th>
                  <th>Konu</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{formatShortDate(m.createdAt)}</td>
                    <td className="sel">{m.to}</td>
                    <td>
                      <details>
                        <summary>{m.subject}</summary>
                        <iframe title={m.subject} srcDoc={m.html} sandbox="" style={{ width: '100%', height: 420, border: '1px solid var(--line)', borderRadius: 6, background: '#fff' }} />
                      </details>
                    </td>
                    <td>
                      <span className={m.status === 'sent' ? 'status status-done' : m.status === 'failed' ? 'status status-bad' : 'status status-wait'}>{LABEL[m.status]}</span>
                      {m.error ? <div className="muted">{m.error}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Henüz e-posta yok.</p>
        )}
      </section>
    </>
  );
}
