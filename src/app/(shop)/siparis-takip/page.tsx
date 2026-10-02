import type { Metadata } from 'next';
import Link from 'next/link';
import { lookupOrder } from '@/app/actions/tracking';
import { ActionForm } from '@/components/forms';

export const metadata: Metadata = { title: 'Sipariş takibi' };

export default function TrackPage() {
  return (
    <div className="wrap narrow page-pad">
      <h1>Sipariş takibi</h1>
      <p className="muted">Sipariş numaran onay e-postasında yazıyor ve &quot;MC&quot; ile başlıyor. Üyeysen siparişlerini <Link href="/hesap">hesabından</Link> da görebilirsin.</p>
      <ActionForm action={lookupOrder} submitLabel="Siparişimi bul" pendingLabel="Aranıyor…" testId="takip-formu">
        <label className="field" htmlFor="number">
          <span>Sipariş numarası</span>
          <input id="number" name="number" placeholder="MC2610021234" autoCapitalize="characters" required />
        </label>
        <label className="field" htmlFor="email">
          <span>Siparişte kullandığın e-posta</span>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </label>
      </ActionForm>
    </div>
  );
}
