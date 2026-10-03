import { and, asc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { db, type Db } from '@/db';
import {
  cartItems,
  carts,
  discountCodes,
  orderEvents,
  orderItems,
  orders,
  users,
  variants,
  type Address,
  type BillingInfo,
  type OrderStatus,
  type PaymentInfo,
} from '@/db/schema';
import { loadCartLines, type CartLine } from './cart';
import {
  adminNewOrderEmail,
  adminRequestEmail,
  cancelledEmail,
  contractsAttachment,
  deliveredEmail,
  orderConfirmationEmail,
  orderUpdateEmail,
  refundedEmail,
  shippedEmail,
} from './emails';
import { appUrl, iyzicoConfig } from './env';
import { istanbulDateKey } from './format';
import {
  cancelPayment,
  initializeCheckoutForm,
  refundPayment,
  retrieveCheckoutForm,
  toKurus,
  verifyInitSignature,
  verifyRetrieveSignature,
  type IyzicoBasketItem,
} from './iyzico';
import { contractsHtml, type ContractItem } from './legal';
import { sendMail } from './mail';
import { formatTL, toIyzicoAmount } from './money';
import { getPaymentSetup, getShopierConfig } from './payment';
import { allocateDiscount, computeTotals, evaluateDiscount } from './pricing';
import { getSettings } from './settings';
import { trackingLink } from './settings-defaults';
import { STATUS_LABEL } from './status';
import { newShopierRandom, type ShopierCallback } from './shopier';
import { isUuid, newOrderNumber, normalizePhone, randomToken } from './utils';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

export type ActionResult = { ok: boolean; message: string };

/* ---------- yardımcılar ---------- */

export function lineOptionsText(l: { color: string; size: string; colorLabel: string; sizeLabel: string; customLines?: { label: string; value: string }[] }): string {
  return [l.color && `${l.colorLabel}: ${l.color}`, l.size && `${l.sizeLabel}: ${l.size}`, ...(l.customLines ?? []).map((c) => `${c.label}: "${c.value}"`)]
    .filter(Boolean)
    .join(', ');
}

function contractItem(l: CartLine): ContractItem {
  return {
    name: l.name,
    options: lineOptionsText(l),
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
    isPersonalized: l.isPersonalized,
  };
}

async function addEvent(exec: Pick<Tx, 'insert'>, orderId: string, status: string, message: string, isPublic: boolean, actor: string) {
  await exec.insert(orderEvents).values({ orderId, status, message, isPublic, actor });
}

async function releaseStock(tx: Tx, orderId: string) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const it of items) {
    if (it.trackStock && it.variantId) {
      await tx
        .update(variants)
        .set({ stock: sql`${variants.stock} + ${it.quantity}` })
        .where(eq(variants.id, it.variantId));
    }
  }
  await tx.update(orders).set({ stockReserved: false }).where(eq(orders.id, orderId));
}

async function loadOrder(id: string): Promise<{ order: OrderRow; items: ItemRow[] } | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.productName));
  return { order, items };
}

/* ---------- sipariş oluşturma ---------- */

export type CheckoutData = {
  email: string;
  phone: string;
  shipping: Address;
  billing: BillingInfo;
  note: string;
  userId: string | null;
  cartId: string;
  ip: string;
  userAgent: string;
};

class StockError extends Error {}

export async function createOrderFromCart(
  data: CheckoutData,
): Promise<{ ok: true; orderId: string; number: string; accessToken: string } | { ok: false; error: string }> {
  const settings = await getSettings();
  const lines = await loadCartLines(data.cartId);
  if (!lines.length) return { ok: false, error: 'Sepetin boş.' };
  const bad = lines.find((l) => l.problem);
  if (bad) return { ok: false, error: `${bad.name}: ${bad.problem} Sepetini güncelleyip tekrar dene.` };

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const [cart] = await db.select({ discountCode: carts.discountCode }).from(carts).where(eq(carts.id, data.cartId)).limit(1);
  let discount = 0;
  let code = '';
  if (cart?.discountCode) {
    const d = await evaluateDiscount(cart.discountCode, subtotal);
    if (!d.ok) {
      await db.update(carts).set({ discountCode: '' }).where(eq(carts.id, data.cartId));
      return { ok: false, error: `${d.error} Kod sepetinden kaldırıldı, tekrar dene.` };
    }
    discount = d.amount;
    code = d.code;
  }
  const totals = computeTotals(subtotal, discount, settings);
  const pay = await getPaymentSetup();
  const number = newOrderNumber();
  const accessToken = randomToken(24);
  const s = data.shipping;
  const contract = contractsHtml({
    settings,
    buyer: {
      name: `${s.firstName} ${s.lastName}`,
      email: data.email,
      phone: data.phone,
      address: `${s.line}, ${s.district} / ${s.city}`,
    },
    items: lines.map(contractItem),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    shippingTotal: totals.shippingTotal,
    total: totals.total,
    date: new Date(),
    orderNumber: number,
    paymentLabel: pay.label,
  });

  try {
    const orderId = await db.transaction(async (tx) => {
      for (const l of lines) {
        if (!l.trackStock) continue;
        const r = await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} - ${l.quantity}` })
          .where(and(eq(variants.id, l.variantId), gte(variants.stock, l.quantity)))
          .returning({ id: variants.id });
        if (!r.length) throw new StockError(l.name);
      }
      const [o] = await tx
        .insert(orders)
        .values({
          number,
          accessToken,
          userId: data.userId,
          email: data.email,
          phone: data.phone,
          status: 'pending_payment',
          shippingAddress: data.shipping,
          billing: data.billing,
          note: data.note,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shippingTotal: totals.shippingTotal,
          total: totals.total,
          discountCode: code,
          stockReserved: true,
          cartId: data.cartId,
          contractsHtml: contract,
          agreementsAcceptedAt: new Date(),
          ip: data.ip,
          userAgent: data.userAgent,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: o.id,
          productId: l.productId,
          variantId: l.variantId,
          productName: l.name,
          productSlug: l.slug,
          color: l.color,
          size: l.size,
          colorLabel: l.colorLabel,
          sizeLabel: l.sizeLabel,
          customization: l.customLines,
          isPersonalized: l.isPersonalized,
          trackStock: l.trackStock,
          sku: l.sku,
          imageUrl: l.thumbUrl || l.imageUrl,
          categoryName: l.categoryName,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      );
      await addEvent(tx, o.id, 'pending_payment', 'Sipariş oluşturuldu, ödeme bekleniyor.', false, 'sistem');
      return o.id;
    });
    return { ok: true, orderId, number, accessToken };
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: `${e.message} için yeterli stok kalmadı. Sepetini güncelleyip tekrar dene.` };
    throw e;
  }
}

/* ---------- ödeme ---------- */

function iyzicoPhone(p: string): string {
  const n = normalizePhone(p);
  return n.startsWith('0') ? `+9${n}` : `+90${n}`;
}

function cut(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Siparişin hangi altyapıyla ödendiği / ödeneceği. */
export function paymentProviderOf(o: Pick<OrderRow, 'paymentInfo' | 'paymentToken'>): 'iyzico' | 'shopier' {
  if (o.paymentInfo?.provider) return o.paymentInfo.provider;
  return o.paymentToken?.startsWith('shopier:') ? 'shopier' : 'iyzico';
}

export async function startPayment(orderId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const setup = await getPaymentSetup();
  if (setup.provider === 'shopier') return startShopierPayment(orderId);
  return startIyzicoPayment(orderId);
}

/** Shopier: siparişe rastgele sayı atar, müşteriyi imzalı formu basan sayfaya yollar. */
async function startShopierPayment(orderId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: 'Sipariş bulunamadı.' };
  const cfg = await getShopierConfig();
  if (!cfg.apiKey || !cfg.apiSecret) {
    await markPaymentFailed(o.id, 'Shopier anahtarları tanımlı değil.', 'sistem');
    return { ok: false, error: 'Online ödeme şu an kullanılamıyor. Lütfen daha sonra tekrar dene.' };
  }
  await db
    .update(orders)
    .set({ paymentToken: `shopier:${o.number}:${newShopierRandom()}`, paymentInfo: { ...(o.paymentInfo ?? {}), provider: 'shopier' }, updatedAt: new Date() })
    .where(eq(orders.id, o.id));
  return { ok: true, url: `${appUrl()}/api/odeme/shopier/baslat?siparis=${o.number}&t=${o.accessToken}` };
}

/** Shopier ödeme formuna girecek bilgiler. */
export async function shopierFormData(o: OrderRow) {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(asc(orderItems.productName));
  const ship = o.shippingAddress;
  const bill = o.billing.sameAsShipping ? ship : o.billing.address;
  let accountAgeDays = 0;
  if (o.userId) {
    const [u] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, o.userId)).limit(1);
    if (u) accountAgeDays = (Date.now() - u.createdAt.getTime()) / 86400000;
  }
  const productName = items.map((i) => `${i.productName}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ');
  return {
    orderNumber: o.number,
    randomNr: o.paymentToken?.split(':')[2] ?? '',
    amount: toIyzicoAmount(o.total),
    productName: productName || `Sipariş ${o.number}`,
    buyer: { name: ship.firstName, surname: ship.lastName, email: o.email, phone: normalizePhone(o.phone).replace(/^0/, ''), accountAgeDays },
    billing: { address: `${bill.line} ${bill.district}`, city: bill.city, postcode: bill.zip || '' },
    shipping: { address: `${ship.line} ${ship.district}`, city: ship.city, postcode: ship.zip || '' },
  };
}

async function startIyzicoPayment(orderId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const loaded = await loadOrder(orderId);
  if (!loaded) return { ok: false, error: 'Sipariş bulunamadı.' };
  const { order: o, items } = loaded;
  const cfg = iyzicoConfig();

  const alloc = allocateDiscount(items.map((i) => i.lineTotal), o.discountTotal);
  const basketItems: IyzicoBasketItem[] = items.map((i, idx) => ({
    id: i.id,
    name: cut(i.productName, 100),
    category1: cut(i.categoryName || 'Genel', 50),
    itemType: 'PHYSICAL',
    price: toIyzicoAmount(alloc[idx]),
  }));
  if (o.shippingTotal > 0) {
    basketItems.push({ id: 'KARGO', name: 'Kargo bedeli', category1: 'Kargo', itemType: 'VIRTUAL', price: toIyzicoAmount(o.shippingTotal) });
  }
  const basketSum = alloc.reduce((a, b) => a + b, 0) + o.shippingTotal;
  if (basketSum !== o.total) {
    await markPaymentFailed(o.id, `Sepet tutarı hesaplanamadı (${basketSum} / ${o.total}).`, 'sistem');
    return { ok: false, error: 'Sipariş tutarı hesaplanırken bir hata oluştu. Lütfen tekrar dene.' };
  }

  const ship = o.shippingAddress;
  const bill = o.billing.sameAsShipping ? ship : o.billing.address;
  const fullName = `${ship.firstName} ${ship.lastName}`;
  const billName = o.billing.type === 'corporate' && o.billing.companyName ? o.billing.companyName : `${bill.firstName} ${bill.lastName}`;
  const res = await initializeCheckoutForm({
    locale: 'tr',
    conversationId: o.number,
    price: toIyzicoAmount(o.total),
    paidPrice: toIyzicoAmount(o.total),
    currency: 'TRY',
    basketId: o.number,
    paymentGroup: 'PRODUCT',
    callbackUrl: `${appUrl()}/api/odeme/iyzico/callback`,
    buyer: {
      id: o.userId ?? `misafir-${o.number}`,
      name: ship.firstName,
      surname: ship.lastName,
      gsmNumber: iyzicoPhone(o.phone),
      email: o.email,
      identityNumber: o.billing.identityNumber || '11111111111',
      registrationAddress: cut(`${ship.line} ${ship.district}`, 250),
      ip: o.ip || '127.0.0.1',
      city: ship.city,
      country: 'Turkey',
      ...(ship.zip ? { zipCode: ship.zip } : {}),
    },
    shippingAddress: { contactName: fullName, city: ship.city, country: 'Turkey', address: cut(`${ship.line} ${ship.district}`, 250), ...(ship.zip ? { zipCode: ship.zip } : {}) },
    billingAddress: { contactName: billName, city: bill.city, country: 'Turkey', address: cut(`${bill.line} ${bill.district}`, 250), ...(bill.zip ? { zipCode: bill.zip } : {}) },
    basketItems,
  });

  if (res.status !== 'success' || !res.token || !res.paymentPageUrl) {
    const msg = res.errorMessage || 'iyzico ödeme sayfasını açamadı.';
    await markPaymentFailed(o.id, msg, 'iyzico');
    return { ok: false, error: `Ödeme sayfası açılamadı: ${msg}` };
  }
  await db
    .update(orders)
    .set({ paymentToken: res.token, paymentInfo: { ...(o.paymentInfo ?? {}), provider: 'iyzico' }, updatedAt: new Date() })
    .where(eq(orders.id, o.id));
  if (verifyInitSignature(res, cfg.secretKey) === false) {
    await addEvent(db, o.id, '', 'iyzico başlatma yanıtının imzası doğrulanamadı.', false, 'sistem');
  }
  return { ok: true, url: res.paymentPageUrl };
}

export async function markPaymentFailed(orderId: string, message: string, actor: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!o || o.status !== 'pending_payment') return;
    if (o.stockReserved) await releaseStock(tx, o.id);
    await tx
      .update(orders)
      .set({ status: 'payment_failed', stockReserved: false, paymentInfo: { ...(o.paymentInfo ?? {}), errorMessage: message }, updatedAt: new Date() })
      .where(eq(orders.id, o.id));
    await addEvent(tx, o.id, 'payment_failed', `Ödeme alınamadı: ${message}`, true, actor);
  });
}

export type FinalizeResult = { orderId: string; number: string; accessToken: string; status: OrderStatus };

export async function finalizePayment(token: string, source: string): Promise<FinalizeResult | null> {
  const [found] = await db.select().from(orders).where(eq(orders.paymentToken, token)).limit(1);
  if (!found) return null;
  const base = { orderId: found.id, number: found.number, accessToken: found.accessToken };
  if (found.status !== 'pending_payment' && found.status !== 'payment_failed') return { ...base, status: found.status };

  const cfg = iyzicoConfig();
  const r = await retrieveCheckoutForm(token, found.number);
  const success = r.status === 'success' && r.paymentStatus === 'SUCCESS';
  if (!success) {
    if (found.status === 'pending_payment') {
      await markPaymentFailed(found.id, r.errorMessage || 'Ödeme tamamlanmadı.', `iyzico (${source})`);
    }
    return { ...base, status: 'payment_failed' };
  }

  const sigOk = verifyRetrieveSignature(r, cfg.secretKey);
  const priceKurus = toKurus(r.price);
  const paidKurus = toKurus(r.paidPrice);
  const warnings: string[] = [];
  if (r.basketId && r.basketId !== found.number) warnings.push(`iyzico sepet numarası (${r.basketId}) siparişle uyuşmuyor.`);
  if (priceKurus && priceKurus !== found.total) warnings.push(`Tutar uyuşmuyor: iyzico ${formatTL(priceKurus)}, sipariş ${formatTL(found.total)}.`);
  if (sigOk === false) warnings.push('iyzico yanıt imzası doğrulanamadı. Ödemeyi iyzico panelinden kontrol edin.');
  if (r.fraudStatus === 0) warnings.push('iyzico bu ödemeyi incelemeye aldı. iyzico panelinde onaylanmadan kargolamayın.');

  await applyPaid(found.id, {
    paymentId: String(r.paymentId ?? ''),
    paidTotal: paidKurus || null,
    installment: r.installment ?? 1,
    paymentInfo: {
      provider: 'iyzico',
      cardFamily: r.cardFamily,
      cardAssociation: r.cardAssociation,
      cardType: r.cardType,
      lastFourDigits: r.lastFourDigits,
      binNumber: r.binNumber,
      fraudStatus: r.fraudStatus,
      installment: r.installment,
      signatureOk: sigOk,
      sandbox: cfg.sandbox,
    },
    itemTransactions: (r.itemTransactions ?? []).map((t) => ({ itemId: String(t.itemId), transactionId: String(t.paymentTransactionId) })),
    warnings,
    actor: `iyzico (${source})`,
  });
  return { ...base, status: 'paid' };
}

type PaidData = {
  paymentId: string;
  paidTotal: number | null;
  installment: number;
  paymentInfo: PaymentInfo;
  itemTransactions?: { itemId: string; transactionId: string }[];
  warnings: string[];
  actor: string;
};

/** Ödemesi doğrulanan siparişi "ödendi" yapar: stok, kupon, sepet, olay kaydı ve e-postalar. */
async function applyPaid(orderId: string, p: PaidData): Promise<boolean> {
  const warnings = [...p.warnings];
  let becamePaid = false;
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!o || (o.status !== 'pending_payment' && o.status !== 'payment_failed')) return;
    if (!o.stockReserved) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      for (const it of items) {
        if (it.trackStock && it.variantId) {
          await tx
            .update(variants)
            .set({ stock: sql`${variants.stock} - ${it.quantity}` })
            .where(eq(variants.id, it.variantId));
        }
      }
      warnings.push('Ödeme, stok ayırma süresi dolduktan sonra onaylandı. Stok yeniden düşüldü; eksiye düşen stok olup olmadığını kontrol edin.');
    }
    await tx
      .update(orders)
      .set({
        status: 'paid',
        paymentId: p.paymentId,
        paidTotal: p.paidTotal || o.total,
        installment: p.installment,
        paymentInfo: p.paymentInfo,
        paidAt: new Date(),
        stockReserved: true,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, o.id));
    for (const tr of p.itemTransactions ?? []) {
      if (!isUuid(tr.itemId)) continue;
      await tx
        .update(orderItems)
        .set({ paymentTransactionId: tr.transactionId })
        .where(and(eq(orderItems.orderId, o.id), eq(orderItems.id, tr.itemId)));
    }
    if (o.discountCode) {
      await tx
        .update(discountCodes)
        .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
        .where(eq(discountCodes.code, o.discountCode));
    }
    if (o.cartId) {
      await tx.delete(cartItems).where(eq(cartItems.cartId, o.cartId));
      await tx.update(carts).set({ discountCode: '', updatedAt: new Date() }).where(eq(carts.id, o.cartId));
    }
    await addEvent(tx, o.id, 'paid', 'Ödemen alındı. Siparişin hazırlanmayı bekliyor.', true, p.actor);
    for (const w of warnings) await addEvent(tx, o.id, '', w, false, 'sistem');
    becamePaid = true;
  });
  if (becamePaid) await sendPaidEmails(orderId);
  return becamePaid;
}

/** Shopier'in imzası doğrulanmış geri dönüşünü işler. */
export async function finalizeShopierPayment(cb: ShopierCallback): Promise<FinalizeResult | null> {
  if (!/^[A-Z0-9]{6,20}$/.test(cb.orderNumber)) return null;
  const [found] = await db.select().from(orders).where(eq(orders.number, cb.orderNumber)).limit(1);
  if (!found) return null;
  const base = { orderId: found.id, number: found.number, accessToken: found.accessToken };
  if (found.status !== 'pending_payment' && found.status !== 'payment_failed') return { ...base, status: found.status };

  if (cb.status !== 'success') {
    if (found.status === 'pending_payment') await markPaymentFailed(found.id, 'Ödeme Shopier sayfasında tamamlanmadı.', 'Shopier (dönüş)');
    return { ...base, status: 'payment_failed' };
  }
  const warnings: string[] = [];
  const expected = found.paymentToken?.startsWith('shopier:') ? found.paymentToken.split(':')[2] : '';
  if (expected && expected !== cb.randomNr) warnings.push('Shopier dönüşündeki işlem numarası bu siparişin son ödeme denemesiyle uyuşmuyor. Ödemeyi Shopier panelinden kontrol edin.');
  await applyPaid(found.id, {
    paymentId: cb.paymentId,
    paidTotal: found.total,
    installment: cb.installment,
    paymentInfo: { provider: 'shopier', installment: cb.installment, signatureOk: true },
    warnings,
    actor: 'Shopier (dönüş)',
  });
  return { ...base, status: 'paid' };
}

/** Ödemesi altyapı panelinde görünen ama siteye düşmeyen siparişi yönetici elle onaylar. */
export async function adminConfirmPayment(orderId: string, reference: string, actor: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  const o = l.order;
  if (o.status !== 'pending_payment' && o.status !== 'payment_failed') return notAllowed(o, 'ödeme onayı');
  const ref = reference.trim().slice(0, 80);
  if (!ref) return { ok: false, message: 'Ödeme panelindeki işlem / sipariş numarasını yaz.' };
  const provider = paymentProviderOf(o);
  const ok = await applyPaid(o.id, {
    paymentId: ref,
    paidTotal: o.total,
    installment: 1,
    paymentInfo: { provider, manual: true },
    warnings: [`Ödeme yönetici tarafından elle onaylandı (${provider === 'shopier' ? 'Shopier' : 'iyzico'} işlem no: ${ref}).`],
    actor,
  });
  return ok ? { ok: true, message: 'Ödeme onaylandı, sipariş hazırlanmaya hazır.' } : { ok: false, message: 'Sipariş güncellenemedi, sayfayı yenileyip tekrar dene.' };
}

async function sendPaidEmails(orderId: string) {
  const loaded = await loadOrder(orderId);
  if (!loaded) return;
  const s = await getSettings();
  const c = orderConfirmationEmail(s, loaded.order, loaded.items);
  await sendMail({ to: loaded.order.email, subject: c.subject, html: c.html, attachments: [contractsAttachment(loaded.order)], replyTo: s.contactEmail || undefined });
  const adminTo = s.notifyEmail || s.contactEmail;
  if (adminTo) {
    const a = adminNewOrderEmail(s, loaded.order, loaded.items);
    await sendMail({ to: adminTo, subject: a.subject, html: a.html, replyTo: loaded.order.email });
  }
}

/** Ödeme sayfasında yarıda kalan siparişleri kontrol eder (iyzico'ya sorar), ödenmemişse stoğu geri bırakır. */
export async function cleanupExpiredOrders(limit = 10): Promise<number> {
  const cutoff = new Date(Date.now() - 40 * 60 * 1000);
  const rows = await db
    .select({ id: orders.id, token: orders.paymentToken })
    .from(orders)
    .where(and(eq(orders.status, 'pending_payment'), lt(orders.createdAt, cutoff)))
    .orderBy(asc(orders.createdAt))
    .limit(limit);
  for (const r of rows) {
    try {
      if (r.token?.startsWith('shopier:')) await markPaymentFailed(r.id, 'Shopier ödeme sayfasında ödeme tamamlanmadı, süre doldu.', 'sistem');
      else if (r.token) await finalizePayment(r.token, 'süre kontrolü');
      else await markPaymentFailed(r.id, 'Ödeme sayfasına geçilmedi, süre doldu.', 'sistem');
    } catch (e) {
      console.error('[temizlik] sipariş kontrol edilemedi', r.id, e);
    }
  }
  return rows.length;
}

/* ---------- yönetim işlemleri ---------- */

type RefundResult = ActionResult & { manual?: boolean };

/** Müşteriye gösterilen iade cümlesi. */
function refundPhrase(o: OrderRow, amount: number): string {
  return paymentProviderOf(o) === 'shopier' ? `${formatTL(amount)} iaden başlatıldı, bankana göre birkaç iş günü içinde kartına yansır.` : `${formatTL(amount)} kartına iade edildi.`;
}

async function refundMoney(o: OrderRow, amount: number): Promise<RefundResult> {
  const refundable = (o.paidTotal ?? o.total) - o.refundTotal;
  if (amount <= 0 || amount > refundable) return { ok: false, message: `İade tutarı 0 ile ${formatTL(refundable)} arasında olmalı.` };
  if (paymentProviderOf(o) === 'shopier') {
    // Shopier'in iade için bir API'si yok: iade Shopier panelinden yapılır, burada kaydı tutulur.
    return { ok: true, manual: true, message: `${formatTL(amount)} iade olarak kaydedildi. Tutarı Shopier panelinden müşteriye iade etmeyi unutma.` };
  }
  if (!o.paymentId) return { ok: false, message: 'Bu siparişte iyzico ödeme kaydı yok.' };
  const ip = o.ip || '127.0.0.1';
  const sameDay = !!o.paidAt && istanbulDateKey(o.paidAt) === istanbulDateKey(new Date());
  if (amount === refundable && o.refundTotal === 0 && sameDay) {
    const c = await cancelPayment(o.paymentId, ip, o.number);
    if (c.status === 'success') return { ok: true, message: 'Ödeme aynı gün iptal edildi, karttan çekim düşecek.' };
  }
  const r = await refundPayment(o.paymentId, toIyzicoAmount(amount), ip, o.number);
  if (r.status === 'success') return { ok: true, message: `${formatTL(amount)} karta iade edildi.` };
  return { ok: false, message: `iyzico iadeyi kabul etmedi: ${r.errorMessage || r.errorCode || 'bilinmeyen hata'}` };
}

function notAllowed(o: OrderRow, action: string): ActionResult {
  return { ok: false, message: `"${STATUS_LABEL[o.status]}" durumundaki siparişte ${action} yapılamaz.` };
}

export async function adminSetPreparing(orderId: string, actor: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  if (l.order.status !== 'paid') return notAllowed(l.order, 'hazırlamaya alma');
  await db.update(orders).set({ status: 'preparing', updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addEvent(db, orderId, 'preparing', 'Siparişin hazırlanıyor.', true, actor);
  return { ok: true, message: 'Sipariş hazırlanıyor olarak işaretlendi.' };
}

export async function adminShip(orderId: string, carrierId: string, trackingNumber: string, actor: string, notify: boolean): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  const o = l.order;
  if (!['paid', 'preparing', 'shipped'].includes(o.status)) return notAllowed(o, 'kargolama');
  if (!trackingNumber.trim()) return { ok: false, message: 'Takip numarasını yaz.' };
  const s = await getSettings();
  const carrier = s.carriers.find((c) => c.id === carrierId);
  if (!carrier) return { ok: false, message: 'Kargo firmasını seç.' };
  const url = trackingLink(s.carriers, carrierId, trackingNumber);
  const wasShipped = o.status === 'shipped';
  await db
    .update(orders)
    .set({
      status: 'shipped',
      carrier: carrier.name,
      trackingNumber: trackingNumber.trim(),
      trackingUrl: url,
      shippedAt: wasShipped ? o.shippedAt : new Date(),
      requestType: o.requestType === 'cancel' ? '' : o.requestType,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
  await addEvent(
    db,
    orderId,
    'shipped',
    wasShipped ? `Kargo bilgisi güncellendi: ${carrier.name}, takip no ${trackingNumber.trim()}.` : `Siparişin kargoya verildi: ${carrier.name}, takip no ${trackingNumber.trim()}.`,
    true,
    actor,
  );
  if (notify) {
    const fresh = (await loadOrder(orderId))!.order;
    const m = shippedEmail(s, fresh, carrier.name);
    await sendMail({ to: fresh.email, subject: m.subject, html: m.html, replyTo: s.contactEmail || undefined });
  }
  return { ok: true, message: wasShipped ? 'Kargo bilgisi güncellendi.' : 'Sipariş kargoya verildi olarak işaretlendi.' };
}

export async function adminDeliver(orderId: string, actor: string, notify: boolean): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  if (l.order.status !== 'shipped') return notAllowed(l.order, 'teslim edildi işareti');
  await db.update(orders).set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
  await addEvent(db, orderId, 'delivered', 'Siparişin teslim edildi.', true, actor);
  if (notify) {
    const s = await getSettings();
    const fresh = (await loadOrder(orderId))!.order;
    const m = deliveredEmail(s, fresh);
    await sendMail({ to: fresh.email, subject: m.subject, html: m.html, replyTo: s.contactEmail || undefined });
  }
  return { ok: true, message: 'Sipariş teslim edildi olarak işaretlendi.' };
}

export async function adminCancel(orderId: string, reason: string, restock: boolean, actor: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  const o = l.order;
  if (!['paid', 'preparing', 'shipped'].includes(o.status)) return notAllowed(o, 'iptal');
  const amount = (o.paidTotal ?? o.total) - o.refundTotal;
  let refunded = 0;
  let refundNote = '';
  if (amount > 0) {
    const r = await refundMoney(o, amount);
    if (!r.ok) return r;
    refunded = amount;
    if (r.manual) refundNote = ` ${r.message}`;
  }
  await db.transaction(async (tx) => {
    if (restock && o.stockReserved) await releaseStock(tx, o.id);
    await tx
      .update(orders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        refundedAt: refunded ? new Date() : o.refundedAt,
        refundTotal: o.refundTotal + refunded,
        requestType: '',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, o.id));
    await addEvent(tx, o.id, 'cancelled', `Siparişin iptal edildi.${reason ? ' ' + reason : ''}${refunded ? ` ${refundPhrase(o, refunded)}` : ''}`, true, actor);
  });
  const s = await getSettings();
  const fresh = (await loadOrder(orderId))!.order;
  const m = cancelledEmail(s, fresh, refunded, reason);
  await sendMail({ to: fresh.email, subject: m.subject, html: m.html, replyTo: s.contactEmail || undefined });
  return { ok: true, message: refunded ? `Sipariş iptal edildi, ${formatTL(refunded)} iade edildi.${refundNote}` : 'Sipariş iptal edildi.' };
}

export async function adminRefund(orderId: string, amount: number, restock: boolean, note: string, actor: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  const o = l.order;
  if (!['shipped', 'delivered', 'return_requested', 'refunded'].includes(o.status)) return notAllowed(o, 'iade');
  const r = await refundMoney(o, amount);
  if (!r.ok) return r;
  const refundable = (o.paidTotal ?? o.total) - o.refundTotal;
  const full = amount >= refundable;
  await db.transaction(async (tx) => {
    if (restock && o.stockReserved) await releaseStock(tx, o.id);
    await tx
      .update(orders)
      .set({
        status: full ? 'refunded' : o.status === 'return_requested' ? 'delivered' : o.status,
        refundedAt: new Date(),
        refundTotal: o.refundTotal + amount,
        requestType: '',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, o.id));
    await addEvent(tx, o.id, full ? 'refunded' : '', `${refundPhrase(o, amount)}${note ? ' ' + note : ''}`, true, actor);
  });
  const s = await getSettings();
  const fresh = (await loadOrder(orderId))!.order;
  const m = refundedEmail(s, fresh, amount);
  await sendMail({ to: fresh.email, subject: m.subject, html: m.html, replyTo: s.contactEmail || undefined });
  return { ok: true, message: r.message };
}

export async function adminRejectRequest(orderId: string, note: string, actor: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  const o = l.order;
  if (!o.requestType) return { ok: false, message: 'Bu siparişte açık bir talep yok.' };
  if (!note.trim()) return { ok: false, message: 'Müşteriye gidecek açıklamayı yaz.' };
  const nextStatus: OrderStatus = o.status === 'return_requested' ? 'delivered' : o.status;
  await db.update(orders).set({ status: nextStatus, requestType: '', updatedAt: new Date() }).where(eq(orders.id, orderId));
  const what = o.requestType === 'cancel' ? 'İptal talebin' : 'İade talebin';
  await addEvent(db, orderId, nextStatus === o.status ? '' : nextStatus, `${what} kabul edilmedi: ${note.trim()}`, true, actor);
  const s = await getSettings();
  const fresh = (await loadOrder(orderId))!.order;
  const m = orderUpdateEmail(s, fresh, `${what} kabul edilmedi: ${note.trim()}`);
  await sendMail({ to: fresh.email, subject: m.subject, html: m.html, replyTo: s.contactEmail || undefined });
  return { ok: true, message: 'Talep reddedildi, müşteriye bildirildi.' };
}

export async function adminAddNote(orderId: string, message: string, isPublic: boolean, notify: boolean, actor: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  if (!message.trim()) return { ok: false, message: 'Notu yaz.' };
  await addEvent(db, orderId, '', message.trim(), isPublic, actor);
  if (isPublic && notify) {
    const s = await getSettings();
    const m = orderUpdateEmail(s, l.order, message.trim());
    await sendMail({ to: l.order.email, subject: m.subject, html: m.html, replyTo: s.contactEmail || undefined });
  }
  return { ok: true, message: isPublic ? 'Not eklendi, müşteri görebilir.' : 'İç not eklendi.' };
}

/* ---------- müşteri talepleri ---------- */

export async function customerRequest(orderId: string, kind: 'cancel' | 'return', note: string): Promise<ActionResult> {
  const l = await loadOrder(orderId);
  if (!l) return { ok: false, message: 'Sipariş bulunamadı.' };
  const o = l.order;
  const s = await getSettings();
  if (o.requestType) return { ok: false, message: 'Bu sipariş için açık bir talebin zaten var.' };
  if (kind === 'cancel') {
    if (!['paid', 'preparing'].includes(o.status)) return { ok: false, message: 'Kargoya verilmiş siparişte iptal talebi oluşturulamaz, teslim aldıktan sonra iade talebi oluşturabilirsin.' };
    await db.update(orders).set({ requestType: 'cancel', requestNote: note, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await addEvent(db, orderId, '', `İptal talebin alındı.${note ? ` Notun: "${note}"` : ''} En kısa sürede dönüş yapacağız.`, true, 'müşteri');
  } else {
    if (o.status !== 'delivered') return { ok: false, message: 'İade talebi teslim edilen siparişler için oluşturulabilir.' };
    const deliveredAt = o.deliveredAt ?? o.updatedAt;
    const days = (Date.now() - deliveredAt.getTime()) / 86400000;
    if (days > s.returnDays) return { ok: false, message: `Teslimden itibaren ${s.returnDays} günlük iade süresi doldu. Bir sorun varsa bize yaz.` };
    if (l.items.every((i) => i.isPersonalized)) return { ok: false, message: 'Kişiye özel ürünlerde cayma hakkı yok. Üretim hatası varsa bize yaz, düzeltelim.' };
    await db.update(orders).set({ status: 'return_requested', requestType: 'return', requestNote: note, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await addEvent(db, orderId, 'return_requested', `İade talebin alındı.${note ? ` Notun: "${note}"` : ''} Ürünü nasıl göndereceğini e-postayla bildireceğiz.`, true, 'müşteri');
  }
  const adminTo = s.notifyEmail || s.contactEmail;
  if (adminTo) {
    const m = adminRequestEmail(s, o, kind, note);
    await sendMail({ to: adminTo, subject: m.subject, html: m.html, replyTo: o.email });
  }
  return { ok: true, message: kind === 'cancel' ? 'İptal talebin alındı.' : 'İade talebin alındı.' };
}

export async function ordersForIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(orders).where(inArray(orders.id, ids));
}
