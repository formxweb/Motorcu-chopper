import { NextResponse } from 'next/server';
import { iyzicoConfig } from '@/lib/env';
import { webhookSignature, type WebhookPayload } from '@/lib/iyzico';
import { finalizePayment } from '@/lib/orders';
import { safeEqual } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/* iyzico panelinde "Bildirim adresi" olarak tanımlanır: https://alanadiniz/api/odeme/iyzico/webhook */
export async function POST(req: Request) {
  let p: WebhookPayload;
  try {
    p = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz gövde' }, { status: 400 });
  }
  const cfg = iyzicoConfig();
  const sig = req.headers.get('x-iyz-signature-v3') ?? '';
  if (!cfg.secretKey || !sig || !safeEqual(webhookSignature(p, cfg.secretKey), sig)) {
    return NextResponse.json({ ok: false, error: 'İmza doğrulanamadı' }, { status: 401 });
  }
  if (!p.token) return NextResponse.json({ ok: true, ignored: true });
  try {
    const r = await finalizePayment(p.token, 'bildirim');
    return NextResponse.json({ ok: true, status: r?.status ?? 'bulunamadi' });
  } catch (e) {
    console.error('[iyzico bildirim] hata', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
