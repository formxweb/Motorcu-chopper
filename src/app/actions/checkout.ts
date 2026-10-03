'use server';

import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { addresses, type Address, type BillingInfo } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getCart } from '@/lib/cart';
import { CITIES } from '@/lib/cities';
import type { FormState } from '@/lib/form-state';
import { createOrderFromCart, startPayment } from '@/lib/orders';
import { getPaymentSetup } from '@/lib/payment';
import { clientIp, rateLimit, userAgent } from '@/lib/rate-limit';
import { bool, isUuid, isValidPhone, normalizePhone, str, validTcKimlik } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readAddress(fd: FormData, prefix: string): Address {
  return {
    firstName: str(fd, `${prefix}firstName`),
    lastName: str(fd, `${prefix}lastName`),
    phone: normalizePhone(str(fd, `${prefix}phone`)),
    city: str(fd, `${prefix}city`),
    district: str(fd, `${prefix}district`),
    line: str(fd, `${prefix}line`),
    zip: str(fd, `${prefix}zip`),
  };
}

function addressError(a: Address, label: string): string {
  if (!a.firstName || !a.lastName) return `${label}: ad ve soyadı yaz.`;
  if (!CITIES.includes(a.city)) return `${label}: il seç.`;
  if (!a.district) return `${label}: ilçeyi yaz.`;
  if (a.line.length < 10) return `${label}: mahalle, sokak ve kapı numarasıyla açık adresi yaz.`;
  return '';
}

export async function placeOrder(_prev: FormState, fd: FormData): Promise<FormState> {
  const fields: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !k.startsWith('$')) fields[k] = v;
  const fail = (message: string): FormState => ({ ok: false, message, fields, at: Date.now() });

  if (!(await getPaymentSetup()).ready) return fail('Online ödeme henüz aktif değil. Lütfen daha sonra tekrar dene.');
  const user = await getCurrentUser();
  const cart = await getCart();
  if (!cart.id || !cart.lines.length) return fail('Sepetin boş.');
  if (cart.hasProblems) return fail('Sepetindeki bazı ürünlerin stoğu değişti. Sepetine dönüp kontrol et.');

  const email = (user?.email ?? str(fd, 'email')).toLowerCase();
  if (!EMAIL_RE.test(email)) return fail('Geçerli bir e-posta adresi yaz.');

  let shipping: Address;
  const addressId = str(fd, 'addressId');
  if (user && isUuid(addressId)) {
    const [a] = await db.select().from(addresses).where(and(eq(addresses.id, addressId), eq(addresses.userId, user.id))).limit(1);
    if (!a) return fail('Seçtiğin adres bulunamadı.');
    shipping = { firstName: a.firstName, lastName: a.lastName, phone: a.phone, city: a.city, district: a.district, line: a.line, zip: a.zip };
  } else {
    shipping = readAddress(fd, 's_');
    const err = addressError(shipping, 'Teslimat adresi');
    if (err) return fail(err);
  }
  const phone = normalizePhone(str(fd, 'phone') || shipping.phone);
  if (!isValidPhone(phone)) return fail('Cep telefonunu 05xx xxx xx xx biçiminde yaz. Kargo firması bu numarayla iletişime geçer.');
  shipping.phone = shipping.phone || phone;

  const sameAsShipping = bool(fd, 'billingSame');
  const type = str(fd, 'billingType') === 'corporate' ? 'corporate' : 'individual';
  const billingAddress = sameAsShipping ? shipping : readAddress(fd, 'b_');
  if (!sameAsShipping) {
    const err = addressError(billingAddress, 'Fatura adresi');
    if (err) return fail(err);
  }
  const identityNumber = str(fd, 'identityNumber').replace(/\D/g, '');
  if (identityNumber && !validTcKimlik(identityNumber)) return fail('T.C. kimlik numarası geçersiz. Boş bırakabilirsin.');
  const billing: BillingInfo = {
    type,
    sameAsShipping,
    address: billingAddress,
    identityNumber,
    companyName: type === 'corporate' ? str(fd, 'companyName') : '',
    taxOffice: type === 'corporate' ? str(fd, 'taxOffice') : '',
    taxNumber: type === 'corporate' ? str(fd, 'taxNumber').replace(/\D/g, '') : '',
  };
  if (type === 'corporate' && (!billing.companyName || !billing.taxOffice || !/^\d{10,11}$/.test(billing.taxNumber))) {
    return fail('Kurumsal fatura için firma adı, vergi dairesi ve 10 haneli vergi numarasını yaz.');
  }
  if (!bool(fd, 'agree')) return fail('Ön bilgilendirme formunu ve mesafeli satış sözleşmesini onayla.');

  const ip = await clientIp();
  if (!(await rateLimit(`odeme:${ip}`, 15, 600))) return fail('Çok fazla deneme yaptın. Birkaç dakika sonra tekrar dene.');

  if (user && !isUuid(addressId) && bool(fd, 'saveAddress')) {
    const count = await db.$count(addresses, eq(addresses.userId, user.id));
    await db.insert(addresses).values({
      userId: user.id,
      title: str(fd, 'addressTitle') || 'Adresim',
      ...shipping,
      isDefault: count === 0,
    });
  }

  const created = await createOrderFromCart({
    email,
    phone,
    shipping,
    billing,
    note: str(fd, 'note').slice(0, 500),
    userId: user?.id ?? null,
    cartId: cart.id,
    ip,
    userAgent: await userAgent(),
  });
  if (!created.ok) return fail(created.error);

  const pay = await startPayment(created.orderId);
  if (!pay.ok) return fail(pay.error);
  redirect(pay.url);
}
