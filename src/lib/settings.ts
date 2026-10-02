import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { mergeSettings, type StoreSettings } from './settings-defaults';

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return mergeSettings(rows[0]?.data);
});

export async function saveSettings(patch: Partial<StoreSettings>): Promise<void> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  const next = { ...mergeSettings(rows[0]?.data), ...patch };
  await db
    .insert(settings)
    .values({ id: 1, data: next as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.id, set: { data: next as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/** Satıcı bilgileri eksik mi (yasal metinler için gerekli)? */
export function missingSellerFields(s: StoreSettings): string[] {
  const out: string[] = [];
  if (!s.seller.title) out.push('Satıcı unvanı');
  if (!s.seller.address) out.push('Satıcı adresi');
  if (!s.seller.taxOffice || !s.seller.taxNumber) out.push('Vergi dairesi ve numarası');
  if (!s.contactEmail) out.push('İletişim e-postası');
  if (!s.contactPhone) out.push('İletişim telefonu');
  return out;
}
