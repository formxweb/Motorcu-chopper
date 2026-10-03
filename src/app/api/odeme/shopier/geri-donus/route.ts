import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/env';
import { finalizeShopierPayment } from '@/lib/orders';
import { getShopierConfig } from '@/lib/payment';
import { readShopierCallback } from '@/lib/shopier';

export const dynamic = 'force-dynamic';

/*
 * Shopier, ödeme bitince müşterinin tarayıcısını bu adrese POST ile gönderir.
 * Bu adres Shopier panelinde Entegrasyonlar > Modül Yönetimi > "Geri dönüş URL" olarak tanımlanmalıdır.
 */
export async function POST(req: Request) {
  const body: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) if (typeof v === 'string') body[k] = v;
  } catch {
    return NextResponse.redirect(`${appUrl()}/sepet?odeme=hata`, 303);
  }
  try {
    const cfg = await getShopierConfig();
    const cb = readShopierCallback(body, cfg.apiSecret);
    if (!cb.signatureOk) {
      console.warn('[shopier dönüş] imza doğrulanamadı', cb.orderNumber);
      return NextResponse.redirect(`${appUrl()}/sepet?odeme=hata`, 303);
    }
    const r = await finalizeShopierPayment(cb);
    if (!r) return NextResponse.redirect(`${appUrl()}/sepet?odeme=bulunamadi`, 303);
    const state = r.status === 'payment_failed' ? 'basarisiz' : 'tamam';
    return NextResponse.redirect(`${appUrl()}/siparis/${r.number}?t=${r.accessToken}&odeme=${state}`, 303);
  } catch (e) {
    console.error('[shopier dönüş] hata', e);
    return NextResponse.redirect(`${appUrl()}/sepet?odeme=kontrol`, 303);
  }
}

export async function GET() {
  return NextResponse.redirect(`${appUrl()}/sepet`, 303);
}
