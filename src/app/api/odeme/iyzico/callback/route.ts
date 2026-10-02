import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/env';
import { finalizePayment } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/* iyzico ödeme sayfası, işlem bitince tarayıcıyı bu adrese POST ile gönderir. */
export async function POST(req: Request) {
  let token = '';
  try {
    const form = await req.formData();
    token = String(form.get('token') ?? '');
  } catch {
    token = '';
  }
  if (!token) return NextResponse.redirect(`${appUrl()}/sepet?odeme=hata`, 303);
  try {
    const r = await finalizePayment(token, 'dönüş');
    if (!r) return NextResponse.redirect(`${appUrl()}/sepet?odeme=bulunamadi`, 303);
    const state = r.status === 'payment_failed' ? 'basarisiz' : 'tamam';
    return NextResponse.redirect(`${appUrl()}/siparis/${r.number}?t=${r.accessToken}&odeme=${state}`, 303);
  } catch (e) {
    console.error('[iyzico dönüş] hata', e);
    return NextResponse.redirect(`${appUrl()}/sepet?odeme=kontrol`, 303);
  }
}

export async function GET() {
  return NextResponse.redirect(`${appUrl()}/sepet`, 303);
}
