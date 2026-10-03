import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { appUrl } from '@/lib/env';
import { shopierFormData } from '@/lib/orders';
import { getShopierConfig, shopierCallbackPath } from '@/lib/payment';
import { getSettings } from '@/lib/settings';
import { shopierFormFields, shopierRedirectHtml } from '@/lib/shopier';
import { safeEqual } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/* Siparişi verdikten sonra müşteri buraya gelir; imzalı form Shopier ödeme sayfasına kendiliğinden gönderilir. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const number = url.searchParams.get('siparis') ?? '';
  const token = url.searchParams.get('t') ?? '';
  if (!/^[A-Z0-9]{6,20}$/.test(number) || !token) return NextResponse.redirect(`${appUrl()}/sepet`, 303);

  const [o] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  if (!o || !safeEqual(token, o.accessToken)) return NextResponse.redirect(`${appUrl()}/sepet`, 303);
  const orderPage = `${appUrl()}/siparis/${o.number}?t=${o.accessToken}`;
  if (o.status === 'payment_failed') return NextResponse.redirect(`${orderPage}&odeme=basarisiz`, 303);
  if (o.status !== 'pending_payment' || !o.paymentToken?.startsWith('shopier:')) return NextResponse.redirect(orderPage, 303);

  const cfg = await getShopierConfig();
  if (!cfg.apiKey || !cfg.apiSecret) return NextResponse.redirect(`${appUrl()}/sepet?odeme=kontrol`, 303);
  const [data, settings] = await Promise.all([shopierFormData(o), getSettings()]);
  const fields = shopierFormFields({
    ...data,
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    websiteIndex: cfg.websiteIndex,
    callbackUrl: `${appUrl()}${shopierCallbackPath()}`,
  });
  return new Response(shopierRedirectHtml(fields, settings.storeName), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
