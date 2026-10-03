import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/*
 * Shopier ile ödeme (Shopier > Entegrasyonlar > Modül Yönetimi).
 * Müşteri imzalı bir formla Shopier'in ödeme sayfasına gönderilir; ödeme bitince Shopier
 * tarayıcıyı panelde tanımlı "geri dönüş adresine" POST ile yollar.
 * İmza: base64(HMAC-SHA256(random_nr + platform_order_id + total_order_value + currency, API şifresi))
 * Dönüş imzası: base64(HMAC-SHA256(random_nr + platform_order_id, API şifresi))
 */

export const SHOPIER_PAYMENT_URL = 'https://www.shopier.com/ShowProduct/api_pay4.php';

export function shopierPaymentUrl(): string {
  return (process.env.SHOPIER_PAYMENT_URL || '').trim() || SHOPIER_PAYMENT_URL;
}

export function shopierSign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('base64');
}

export function newShopierRandom(): string {
  return String(randomInt(100000, 999999));
}

export type ShopierFormInput = {
  apiKey: string;
  apiSecret: string;
  websiteIndex: number;
  orderNumber: string;
  randomNr: string;
  /** "1450.00" */
  amount: string;
  productName: string;
  buyer: { name: string; surname: string; email: string; phone: string; accountAgeDays: number };
  billing: { address: string; city: string; postcode: string };
  shipping: { address: string; city: string; postcode: string };
  callbackUrl: string;
};

function clean(s: string, max: number): string {
  const one = s.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return one.length > max ? one.slice(0, max - 1) + '…' : one;
}

/** Shopier ödeme sayfasına POST edilecek alanlar (imza dahil). */
export function shopierFormFields(i: ShopierFormInput): Record<string, string> {
  const currency = '0'; // 0 = TL
  const fields: Record<string, string> = {
    API_key: i.apiKey,
    website_index: String(i.websiteIndex),
    platform_order_id: i.orderNumber,
    product_name: clean(i.productName, 120),
    product_type: '0', // fiziksel ürün
    buyer_name: clean(i.buyer.name, 60),
    buyer_surname: clean(i.buyer.surname, 60),
    buyer_email: i.buyer.email,
    buyer_account_age: String(Math.max(0, Math.floor(i.buyer.accountAgeDays))),
    buyer_id_nr: '0',
    buyer_phone: i.buyer.phone,
    billing_address: clean(i.billing.address, 250),
    billing_city: clean(i.billing.city, 60),
    billing_country: 'Turkey',
    billing_postcode: i.billing.postcode,
    shipping_address: clean(i.shipping.address, 250),
    shipping_city: clean(i.shipping.city, 60),
    shipping_country: 'Turkey',
    shipping_postcode: i.shipping.postcode,
    total_order_value: i.amount,
    currency,
    platform: '0',
    is_in_frame: '0',
    current_language: '0',
    modul_version: '1.0.4',
    random_nr: i.randomNr,
    callback: i.callbackUrl,
  };
  fields.signature = shopierSign(`${i.randomNr}${i.orderNumber}${i.amount}${currency}`, i.apiSecret);
  return fields;
}

export type ShopierCallback = {
  orderNumber: string;
  status: string;
  paymentId: string;
  installment: number;
  randomNr: string;
  signatureOk: boolean;
};

function sameBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** Shopier'in geri dönüş isteğini okur ve imzasını doğrular. */
export function readShopierCallback(body: Record<string, string>, secret: string): ShopierCallback {
  const orderNumber = (body.platform_order_id || '').trim();
  const randomNr = (body.random_nr || '').trim();
  const sig = Buffer.from((body.signature || '').trim(), 'base64');
  const candidates = [`${randomNr}${orderNumber}`];
  if (body.total_order_value !== undefined || body.currency !== undefined) {
    candidates.push(`${randomNr}${orderNumber}${body.total_order_value ?? ''}${body.currency ?? ''}`);
  }
  const signatureOk =
    !!secret && !!orderNumber && !!randomNr && candidates.some((c) => sameBytes(sig, createHmac('sha256', secret).update(c, 'utf8').digest()));
  const inst = Number.parseInt(body.installment || '', 10);
  return {
    orderNumber,
    status: (body.status || '').trim().toLowerCase(),
    paymentId: (body.payment_id || '').trim(),
    installment: Number.isFinite(inst) && inst > 1 ? inst : 1,
    randomNr,
    signatureOk,
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Shopier ödeme sayfasına kendiliğinden geçen küçük HTML sayfası. */
export function shopierRedirectHtml(fields: Record<string, string>, storeName: string): string {
  const inputs = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('\n');
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Güvenli ödeme sayfasına yönlendiriliyorsun</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f1ea;color:#1c1a17;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{max-width:420px;text-align:center}button{font:inherit;font-weight:700;background:#1c1a17;color:#fff;border:0;border-radius:8px;padding:14px 22px;cursor:pointer}p{line-height:1.5}</style>
</head><body><main>
<p><strong>${esc(storeName)}</strong></p>
<p>Kart bilgilerini gireceğin Shopier güvenli ödeme sayfasına yönlendiriliyorsun…</p>
<form id="odeme" method="post" action="${esc(shopierPaymentUrl())}">
${inputs}
<noscript><p>Otomatik yönlendirme çalışmadıysa düğmeye bas.</p></noscript>
<button type="submit">Ödeme sayfasına git</button>
</form>
</main>
<script>document.getElementById('odeme').submit();</script>
</body></html>`;
}
