/*
 * iyzico test (sandbox) sunucusuna gerçek istek atarak kimlik doğrulamayı ve ödeme formu isteğini doğrular.
 * Çalıştırma: IYZICO_SANDBOX_API_KEY=... IYZICO_SANDBOX_SECRET_KEY=... npx tsx scripts/iyzico-sandbox-check.ts
 */
import { initializeCheckoutForm, retrieveCheckoutForm, verifyInitSignature } from '../src/lib/iyzico';

async function main() {
  const key = process.env.IYZICO_SANDBOX_API_KEY;
  const secret = process.env.IYZICO_SANDBOX_SECRET_KEY;
  if (!key || !secret) {
    console.log('atlandı: IYZICO_SANDBOX_API_KEY ve IYZICO_SANDBOX_SECRET_KEY tanımlı değil.');
    return;
  }
  process.env.IYZICO_API_KEY = key;
  process.env.IYZICO_SECRET_KEY = secret;
  process.env.IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com';

  const conv = `KONTROL${Date.now()}`;
  const init = await initializeCheckoutForm({
    locale: 'tr',
    conversationId: conv,
    price: '1600.00',
    paidPrice: '1600.00',
    currency: 'TRY',
    basketId: conv,
    paymentGroup: 'PRODUCT',
    callbackUrl: 'https://example.com/api/odeme/iyzico/callback',
    buyer: {
      id: 'misafir-kontrol',
      name: 'Ali',
      surname: 'Yılmaz',
      gsmNumber: '+905321112233',
      email: 'kontrol@example.com',
      identityNumber: '11111111111',
      registrationAddress: 'Kazımdirik Mah. 372 Sok. No 5 Bornova',
      ip: '85.34.78.112',
      city: 'İzmir',
      country: 'Turkey',
    },
    shippingAddress: { contactName: 'Ali Yılmaz', city: 'İzmir', country: 'Turkey', address: 'Kazımdirik Mah. 372 Sok. No 5 Bornova' },
    billingAddress: { contactName: 'Ali Yılmaz', city: 'İzmir', country: 'Turkey', address: 'Kazımdirik Mah. 372 Sok. No 5 Bornova' },
    basketItems: [
      { id: 'URUN1', name: 'Kot Yelek', category1: 'Kot yelek', itemType: 'PHYSICAL', price: '1450.00' },
      { id: 'KARGO', name: 'Kargo bedeli', category1: 'Kargo', itemType: 'VIRTUAL', price: '150.00' },
    ],
  });
  console.log('başlatma:', init.status, init.errorCode ?? '', init.errorMessage ?? '');
  console.log('ödeme sayfası:', init.paymentPageUrl ?? '-');
  console.log('imza doğrulaması:', verifyInitSignature(init, secret));
  if (init.status !== 'success' || !init.token) process.exit(1);

  const r = await retrieveCheckoutForm(init.token, conv);
  console.log('sorgu (ödenmemiş form, hata beklenir):', r.status, r.paymentStatus ?? '', r.errorCode ?? '', r.errorMessage ?? '');
  if (r.errorCode === '1001' || /api bilgileri/i.test(r.errorMessage ?? '')) process.exit(1);
  console.log('tamam: iyzico kimlik doğrulaması ve istek biçimi doğru.');
}

main().catch((e) => {
  console.error('HATA:', e);
  process.exit(1);
});
