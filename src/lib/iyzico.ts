import { createHmac, randomInt } from 'node:crypto';
import { iyzicoConfig } from './env';
import { safeEqual } from './utils';

/* iyzico REST istemcisi (IYZWSv2 kimlik doğrulama). Belgeler: docs.iyzico.com */

export type IyzicoAddress = { contactName: string; city: string; country: string; address: string; zipCode?: string };

export type IyzicoBasketItem = {
  id: string;
  name: string;
  category1: string;
  itemType: 'PHYSICAL' | 'VIRTUAL';
  price: string;
};

export type CheckoutInitRequest = {
  locale: 'tr' | 'en';
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: 'TRY';
  basketId: string;
  paymentGroup: 'PRODUCT';
  callbackUrl: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
    zipCode?: string;
  };
  shippingAddress: IyzicoAddress;
  billingAddress: IyzicoAddress;
  basketItems: IyzicoBasketItem[];
};

type Base = { status: 'success' | 'failure'; errorCode?: string; errorMessage?: string; errorGroup?: string; conversationId?: string; systemTime?: number };

export type CheckoutInitResponse = Base & {
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  tokenExpireTime?: number;
  signature?: string;
};

export type ItemTransaction = {
  itemId: string;
  paymentTransactionId: string | number;
  price: number | string;
  paidPrice: number | string;
  transactionStatus?: number;
};

export type CheckoutRetrieveResponse = Base & {
  token?: string;
  paymentStatus?: string;
  paymentId?: string | number;
  price?: number | string;
  paidPrice?: number | string;
  currency?: string;
  basketId?: string;
  installment?: number;
  fraudStatus?: number;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  lastFourDigits?: string;
  binNumber?: string;
  itemTransactions?: ItemTransaction[];
  signature?: string;
};

export type RefundResponse = Base & { paymentId?: string | number; price?: number | string };

export function hmacHex(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}

export function authHeaders(path: string, body: string, apiKey: string, secretKey: string): Record<string, string> {
  const randomKey = `${Date.now()}${randomInt(100000000, 999999999)}`;
  const signature = hmacHex(randomKey + path + body, secretKey);
  const auth = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return {
    Authorization: `IYZWSv2 ${Buffer.from(auth, 'utf8').toString('base64')}`,
    'x-iyzi-rnd': randomKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function call<T extends Base>(path: string, payload: unknown): Promise<T> {
  const cfg = iyzicoConfig();
  if (!cfg.apiKey || !cfg.secretKey) {
    return { status: 'failure', errorCode: 'CONFIG', errorMessage: 'iyzico API anahtarları tanımlı değil.' } as T;
  }
  const body = JSON.stringify(payload);
  const res = await fetch(cfg.baseUrl + path, {
    method: 'POST',
    headers: authHeaders(path, body, cfg.apiKey, cfg.secretKey),
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { status: 'failure', errorCode: `HTTP_${res.status}`, errorMessage: `iyzico beklenmeyen yanıt verdi (${res.status}).` } as T;
  }
}

export function initializeCheckoutForm(req: CheckoutInitRequest) {
  return call<CheckoutInitResponse>('/payment/iyzipos/checkoutform/initialize/auth/ecom', req);
}

export function retrieveCheckoutForm(token: string, conversationId = '') {
  return call<CheckoutRetrieveResponse>('/payment/iyzipos/checkoutform/auth/ecom/detail', {
    locale: 'tr',
    conversationId,
    token,
  });
}

export function cancelPayment(paymentId: string, ip: string, conversationId: string) {
  return call<RefundResponse>('/payment/cancel', { locale: 'tr', conversationId, paymentId, ip });
}

export function refundPayment(paymentId: string, amount: string, ip: string, conversationId: string) {
  return call<RefundResponse>('/v2/payment/refund', { locale: 'tr', conversationId, paymentId, price: amount, ip, currency: 'TRY' });
}

/** iyzico imzalarında tutarlar sondaki sıfırlar atılarak yazılır: "10.50" → "10.5" */
function amt(v: unknown): string {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

function s(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}

/** true: doğru, false: hatalı, null: yanıtta imza yok */
export function verifyInitSignature(r: CheckoutInitResponse, secret: string): boolean | null {
  if (!r.signature) return null;
  return safeEqual(hmacHex([s(r.conversationId), s(r.token)].join(':'), secret), r.signature);
}

export function verifyRetrieveSignature(r: CheckoutRetrieveResponse, secret: string): boolean | null {
  if (!r.signature) return null;
  const data = [
    s(r.paymentStatus),
    s(r.paymentId),
    s(r.currency),
    s(r.basketId),
    s(r.conversationId),
    amt(r.paidPrice),
    amt(r.price),
    s(r.token),
  ].join(':');
  return safeEqual(hmacHex(data, secret), r.signature);
}

export type WebhookPayload = {
  paymentConversationId?: string;
  merchantId?: string | number;
  token?: string;
  status?: string;
  iyziReferenceCode?: string;
  iyziEventType?: string;
  iyziEventTime?: number;
  iyziPaymentId?: string | number;
};

export function webhookSignature(p: WebhookPayload, secret: string): string {
  return hmacHex(secret + s(p.iyziEventType) + s(p.iyziPaymentId) + s(p.token) + s(p.paymentConversationId) + s(p.status), secret);
}

export function toKurus(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
