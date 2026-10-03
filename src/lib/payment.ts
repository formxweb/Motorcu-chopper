import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { iyzicoConfig, iyzicoReady } from './env';

/*
 * Ödeme altyapısı seçimi. Shopier anahtarları (yönetim panelinden veya ortam değişkeninden)
 * girilmişse ödemeler Shopier ile, yoksa iyzico anahtarları varsa iyzico ile alınır.
 * Anahtarlar settings tablosunda ayrı satırda (id=2) durur, mağaza ayarlarıyla birlikte
 * tarayıcıya gönderilmez.
 */

const SECRETS_ROW = 2;

export type PaymentProvider = 'shopier' | 'iyzico';

export type ShopierConfig = {
  apiKey: string;
  apiSecret: string;
  websiteIndex: number;
  source: 'env' | 'panel' | 'none';
};

function clampIndex(n: unknown): number {
  const v = Math.trunc(Number(n));
  return v >= 1 && v <= 5 ? v : 1;
}

async function readSecrets(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(settings).where(eq(settings.id, SECRETS_ROW)).limit(1);
  return (rows[0]?.data ?? {}) as Record<string, unknown>;
}

export const getShopierConfig = cache(async (): Promise<ShopierConfig> => {
  const envKey = (process.env.SHOPIER_API_KEY || '').trim();
  const envSecret = (process.env.SHOPIER_API_SECRET || '').trim();
  if (envKey && envSecret) {
    return { apiKey: envKey, apiSecret: envSecret, websiteIndex: clampIndex(process.env.SHOPIER_WEBSITE_INDEX || 1), source: 'env' };
  }
  const d = await readSecrets();
  const apiKey = typeof d.shopierApiKey === 'string' ? d.shopierApiKey : '';
  const apiSecret = typeof d.shopierApiSecret === 'string' ? d.shopierApiSecret : '';
  return { apiKey, apiSecret, websiteIndex: clampIndex(d.shopierWebsiteIndex ?? 1), source: apiKey && apiSecret ? 'panel' : 'none' };
});

export async function saveShopierConfig(next: { apiKey: string; apiSecret?: string; websiteIndex: number }): Promise<void> {
  const current = await readSecrets();
  const data: Record<string, unknown> = { ...current };
  if (!next.apiKey) {
    delete data.shopierApiKey;
    delete data.shopierApiSecret;
  } else {
    data.shopierApiKey = next.apiKey;
    if (next.apiSecret) data.shopierApiSecret = next.apiSecret;
  }
  data.shopierWebsiteIndex = clampIndex(next.websiteIndex);
  await db
    .insert(settings)
    .values({ id: SECRETS_ROW, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.id, set: { data, updatedAt: new Date() } });
}

export type PaymentSetup = {
  provider: PaymentProvider | null;
  ready: boolean;
  /** Müşteriye gösterilen ad: "Shopier", "iyzico" */
  label: string;
  testMode: boolean;
};

export const getPaymentSetup = cache(async (): Promise<PaymentSetup> => {
  let shopier: ShopierConfig | null = null;
  try {
    shopier = await getShopierConfig();
  } catch (e) {
    console.error('[ödeme] Shopier ayarı okunamadı', e);
  }
  if (shopier?.apiKey && shopier.apiSecret) return { provider: 'shopier', ready: true, label: 'Shopier', testMode: false };
  if (iyzicoReady()) return { provider: 'iyzico', ready: true, label: 'iyzico', testMode: iyzicoConfig().sandbox };
  return { provider: null, ready: false, label: '', testMode: false };
});

/** Sözleşmelerde ve bilgi sayfalarında geçen ödeme şekli. */
export function paymentMethodText(label: string): string {
  return label ? `Kredi kartı / banka kartı (${label} güvenli ödeme altyapısı)` : 'Kredi kartı / banka kartı';
}

export function shopierCallbackPath(): string {
  return '/api/odeme/shopier/geri-donus';
}
