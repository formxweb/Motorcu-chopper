import { createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL as string, { max: 2, onnotice: () => {} });
const MOCK = 'http://localhost:4010';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL as string;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD as string;
const SHOTS = 'out/shots';
mkdirSync(SHOTS, { recursive: true });

test.describe.configure({ mode: 'serial' });

let admin: BrowserContext;
let guest: BrowserContext;
let member: BrowserContext;
const S: { guestOrder?: string; guestUrl?: string; webhookOrder?: string; memberOrder?: string } = {};

async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function stock(slug: string, color: string, size: string): Promise<number> {
  const [r] = await sql<{ stock: number }[]>`select v.stock from variants v join products p on p.id = v.product_id where p.slug = ${slug} and v.color = ${color} and v.size = ${size}`;
  return r.stock;
}

async function orderRow(number: string) {
  const [r] = await sql`select * from orders where number = ${number}`;
  return r;
}

async function mockCalls(): Promise<{ path: string; body: Record<string, unknown>; authErr: string }[]> {
  const res = await fetch(`${MOCK}/_kayit`);
  return res.json();
}

async function addToCart(page: Page, slug: string, opts: { color?: string; size?: string; custom?: Record<string, string> } = {}) {
  await go(page, `/urun/${slug}`);
  if (opts.color) await page.getByRole('button', { name: opts.color, exact: true }).click();
  if (opts.size) await page.getByRole('button', { name: opts.size, exact: true }).click();
  for (const [k, v] of Object.entries(opts.custom ?? {})) await page.locator(`#ozel_${k}`).fill(v);
  await page.getByTestId('sepete-ekle').click();
  await expect(page.getByTestId('sepet-mesaji')).toContainText('sepete eklendi');
}

async function checkout(page: Page, opts: { guest: boolean; result: 'ok' | 'fail' | 'none' }) {
  await go(page, '/sepet');
  await page.getByTestId('odemeye-gec').click();
  await page.waitForURL('**/odeme');
  await page.waitForLoadState('networkidle');
  if (opts.guest) await page.locator('#email').fill('misafir@example.com');
  await page.locator('#phone').fill('0532 111 22 33');
  if (await page.locator('#s_firstName').count()) {
    await page.locator('#s_firstName').fill('Ali');
    await page.locator('#s_lastName').fill('Yılmaz');
    await page.locator('#s_city').selectOption('İzmir');
    await page.locator('#s_district').fill('Bornova');
    await page.locator('#s_line').fill('Kazımdirik Mah. 372 Sok. No 5 Daire 3');
  }
  await page.getByTestId('sozlesme-onay').check();
  await page.getByTestId('odemeye-ilerle').click();
  await page.waitForURL(`${MOCK}/odeme/**`);
  const token = new URL(page.url()).pathname.split('/').pop() as string;
  if (opts.result === 'ok') await page.getByRole('button', { name: 'Ödemeyi onayla' }).click();
  if (opts.result === 'fail') await page.getByRole('button', { name: 'Ödeme başarısız' }).click();
  if (opts.result !== 'none') {
    await page.waitForURL('**/siparis/**');
    await page.waitForLoadState('networkidle');
  }
  return token;
}

async function adminOrder(page: Page, number: string) {
  const [r] = await sql<{ id: string }[]>`select id from orders where number = ${number}`;
  await go(page, `/yonetim/siparisler/${r.id}`);
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  admin = await browser.newContext();
  guest = await browser.newContext();
  member = await browser.newContext();
});

test.afterAll(async () => {
  await sql.end();
});

test('mağaza kapalıyken ziyaretçi "yakında" sayfasını görür', async () => {
  const page = await guest.newPage();
  await go(page, '/');
  await expect(page.getByRole('heading', { name: 'Mağazamız çok yakında açılıyor' })).toBeVisible();
  await shot(page, '00-yakinda');
  await page.close();
});

test('yönetici giriş yapar, satıcı bilgilerini girer ve mağazayı açar', async () => {
  const page = await admin.newPage();
  await go(page, '/yonetim');
  await expect(page).toHaveURL(/\/yonetim\/giris/);
  await page.locator('#a-email').fill(ADMIN_EMAIL);
  await page.locator('#a-password').fill('yanlis-sifre');
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await expect(page.getByRole('alert')).toContainText('hatalı');
  await page.locator('#a-password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL('**/yonetim');
  await expect(page.getByRole('heading', { name: 'Özet' })).toBeVisible();

  await go(page, '/yonetim/ayarlar');
  const magaza = page.getByTestId('ayar-magaza');
  await magaza.getByTestId('magaza-acik').check();
  await magaza.locator('#contactEmail').fill('info@example.com');
  await magaza.getByRole('button', { name: 'Kaydet' }).click();
  await expect(magaza.getByRole('status')).toHaveText('Ayarlar kaydedildi.');

  const satici = page.getByTestId('ayar-satici');
  await satici.locator('#title').fill('Arda Deri Tekstil - Arda Örnek');
  await satici.locator('#address').fill('Kemeraltı Çarşısı No 1, Konak / İzmir');
  await satici.locator('#taxOffice').fill('Konak');
  await satici.locator('#taxNumber').fill('1234567890');
  await satici.getByRole('button', { name: 'Kaydet' }).click();
  await expect(satici.getByRole('status')).toHaveText('Ayarlar kaydedildi.');
  await page.close();
});

test('ana sayfa, kategori ve ürün sayfası açılır', async ({ browser }) => {
  const page = await guest.newPage();
  await go(page, '/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kulüp yeleği');
  expect(await page.getByTestId('urun-karti').count()).toBeGreaterThanOrEqual(6);
  await shot(page, '01-ana-sayfa');

  await go(page, '/urunler?kategori=deri-yelek');
  await expect(page.getByTestId('urun-sayisi')).toHaveText('6 ürün');
  await shot(page, '02-kategori');

  await go(page, '/urunler?q=kot');
  await expect(page.getByTestId('urun-sayisi')).toHaveText('2 ürün');

  await go(page, '/urun/yan-bagcikli-deri-yelek');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yan Bağcıklı Deri Yelek');
  await expect(page.getByTestId('stok-durumu')).toHaveText('Beden seç');
  await shot(page, '03-urun');
  await page.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const m = await mobile.newPage();
  await go(m, '/');
  await shot(m, '10-mobil-ana-sayfa');
  await go(m, '/urun/kisiye-ozel-rocker-seti');
  await shot(m, '11-mobil-urun');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
  await mobile.close();
});

test('misafir sepete ekler, kartla öder ve stok düşer', async () => {
  const page = await guest.newPage();
  const before = await stock('klasik-deri-yelek', 'Kahve', 'L');
  await addToCart(page, 'klasik-deri-yelek', { color: 'Kahve', size: 'L' });
  await expect(page.getByTestId('sepet-adet')).toHaveText('1');
  await addToCart(page, 'kisiye-ozel-rocker-seti', { color: 'Kırmızı / siyah', size: 'Blok', custom: { ust: 'Kara Kartal', alt: 'Ankara' } });

  await go(page, '/sepet');
  await expect(page.getByTestId('sepet-satirlari').locator('li')).toHaveCount(2);
  await expect(page.getByText('“Kara Kartal”')).toBeVisible();
  await page.getByRole('button', { name: 'Bir arttır' }).nth(1).click();
  await expect(page.getByTestId('satir-adet').nth(1)).toHaveText('2');
  await expect(page.getByTestId('sepet-toplam')).toHaveText('6.350 TL');
  await shot(page, '04-sepet');

  await go(page, '/odeme');
  await expect(page.getByTestId('test-modu')).toBeVisible();
  await page.getByTestId('odemeye-ilerle').click();
  await expect(page.getByTestId('odeme-hata')).toContainText('e-posta');
  await shot(page, '05-odeme');

  await checkout(page, { guest: true, result: 'ok' });
  await expect(page.getByTestId('odeme-basarili')).toBeVisible();
  const number = (await page.getByTestId('siparis-no').textContent())?.trim() as string;
  expect(number).toMatch(/^MC\d{11}$/);
  S.guestOrder = number;
  S.guestUrl = page.url().replace(/&odeme=.*/, '');
  await shot(page, '06-siparis-alindi');

  const o = await orderRow(number);
  expect(o.status).toBe('paid');
  expect(o.total).toBe(635000);
  expect(o.payment_id).toBeTruthy();
  expect(await stock('klasik-deri-yelek', 'Kahve', 'L')).toBe(before - 1);
  await expect(page.getByTestId('sepet-adet')).toHaveCount(0);
  const [mail] = await sql`select subject from email_log where "to" = 'misafir@example.com' order by created_at desc limit 1`;
  expect(mail.subject).toBe(`Siparişin alındı (${number})`);
  const calls = await mockCalls();
  expect(calls.filter((c) => c.authErr).length).toBe(0);
  const init = calls.find((c) => c.path.endsWith('/initialize/auth/ecom'));
  expect(init?.body.price).toBe('6350.00');
  await page.close();
});

test('ödeme başarısız olursa stok geri döner ve sepet korunur', async () => {
  const page = await guest.newPage();
  const before = await stock('cuzdan-zinciri', '', '');
  await addToCart(page, 'cuzdan-zinciri');
  await checkout(page, { guest: true, result: 'fail' });
  await expect(page.getByTestId('odeme-basarisiz')).toBeVisible();
  await expect(page.getByTestId('odeme-basarisiz')).toContainText('Kart limiti yetersiz');
  expect(await stock('cuzdan-zinciri', '', '')).toBe(before);
  await expect(page.getByTestId('sepet-adet')).toHaveText('1');
  await go(page, '/sepet');
  await page.getByRole('button', { name: 'Kaldır' }).click();
  await expect(page.getByText('Sepetin boş.')).toBeVisible();
  await page.close();
});

test('iyzico bildirimi (webhook) ödemeyi onaylar, sahte imza reddedilir', async ({ request }) => {
  const page = await guest.newPage();
  await addToCart(page, 'deri-bakim-kremi');
  const token = await checkout(page, { guest: true, result: 'none' });
  const [o] = await sql<{ number: string; status: string }[]>`select number, status from orders where payment_token = ${token}`;
  expect(o.status).toBe('pending_payment');
  await fetch(`${MOCK}/_sonuc?token=${token}&r=ok`);

  const payload = { paymentConversationId: o.number, merchantId: 1, token, status: 'SUCCESS', iyziReferenceCode: 'ref', iyziEventType: 'CHECKOUT_FORM_AUTH', iyziEventTime: Date.now(), iyziPaymentId: 123 };
  const secret = process.env.IYZICO_SECRET_KEY as string;
  const sig = createHmac('sha256', secret)
    .update(secret + payload.iyziEventType + payload.iyziPaymentId + payload.token + payload.paymentConversationId + payload.status)
    .digest('hex');
  const bad = await request.post('/api/odeme/iyzico/webhook', { data: payload, headers: { 'X-IYZ-SIGNATURE-V3': 'yanlis' } });
  expect(bad.status()).toBe(401);
  const ok = await request.post('/api/odeme/iyzico/webhook', { data: payload, headers: { 'X-IYZ-SIGNATURE-V3': sig } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).status).toBe('paid');
  expect((await orderRow(o.number)).status).toBe('paid');
  S.webhookOrder = o.number;
  await page.close();
});

test('yönetici siparişi hazırlar, kargolar ve teslim eder; müşteri takip eder', async () => {
  const page = await admin.newPage();
  await go(page, '/yonetim/siparisler');
  await expect(page.getByTestId('siparis-tablosu')).toContainText(S.guestOrder as string);
  await adminOrder(page, S.guestOrder as string);
  await expect(page.getByText('“Kara Kartal”')).toBeVisible();
  await shot(page, '20-yonetim-siparis');
  await page.getByTestId('op-hazirla').getByRole('button').click();
  await expect(page.getByTestId('durum')).toHaveText('Hazırlanıyor');
  const kargo = page.getByTestId('op-kargola');
  await kargo.locator('#carrier').selectOption('yurtici');
  await kargo.locator('#trackingNumber').fill('123456789012');
  await kargo.getByRole('button').click();
  await expect(page.getByTestId('durum')).toHaveText('Kargoda');
  await page.getByTestId('op-teslim').getByRole('button').click();
  await expect(page.getByTestId('durum')).toHaveText('Teslim edildi');
  await page.close();

  const c = await guest.newPage();
  await go(c, S.guestUrl as string);
  await expect(c.getByTestId('kargo-bilgisi')).toContainText('123456789012');
  await expect(c.getByTestId('durum')).toHaveText('Teslim edildi');
  await shot(c, '07-siparis-takip');
  const subjects = (await sql<{ subject: string }[]>`select subject from email_log where "to" = 'misafir@example.com'`).map((r) => r.subject);
  expect(subjects).toContain(`Siparişin kargoda (${S.guestOrder})`);
  expect(subjects).toContain(`Siparişin teslim edildi (${S.guestOrder})`);
  await c.close();
});

test('müşteri iade talebi oluşturur, yönetici kısmi ve tam iade yapar', async () => {
  const c = await guest.newPage();
  await go(c, S.guestUrl as string);
  await c.getByText('İade talebi oluştur').click();
  await c.locator('#talep-return').fill('Beden büyük geldi, M ile değişim istiyorum');
  await c.getByTestId('iade-formu').getByRole('button', { name: 'Talebi gönder' }).click();
  await expect(c.getByTestId('talep-mesaji')).toHaveText('İade talebin alındı.');
  await c.close();

  const page = await admin.newPage();
  await adminOrder(page, S.guestOrder as string);
  await expect(page.getByTestId('durum')).toHaveText('İade talebi');
  const iade = page.getByTestId('op-iade');
  await iade.locator('#amount').fill('100');
  await iade.locator('input[name="onay"]').check();
  await iade.getByRole('button', { name: 'İadeyi gönder' }).click();
  await expect(page.getByTestId('durum')).toHaveText('Teslim edildi');
  await page.getByText('Ücret iadesi yap').click();
  const iade2 = page.getByTestId('op-iade');
  await expect(iade2.locator('#amount')).toHaveValue('6250');
  await iade2.locator('input[name="onay"]').check();
  await iade2.getByRole('button', { name: 'İadeyi gönder' }).click();
  await expect(page.getByTestId('durum')).toHaveText('İade edildi');
  const refunds = (await mockCalls()).filter((x) => x.path === '/v2/payment/refund');
  expect(refunds.map((r) => r.body.price)).toEqual(['100.00', '6250.00']);
  const o = await orderRow(S.guestOrder as string);
  expect(o.refund_total).toBe(635000);
  await page.close();
});

test('yönetici ödenmiş siparişi iptal eder, aynı gün iptali yapılır ve stok geri gelir', async () => {
  const before = await stock('deri-bakim-kremi', '', '');
  const page = await admin.newPage();
  await adminOrder(page, S.webhookOrder as string);
  await page.getByText('Siparişi iptal et ve ücreti iade et').click();
  const iptal = page.getByTestId('op-iptal');
  await iptal.getByRole('button', { name: 'İptal et ve iade et' }).click();
  await expect(iptal.getByRole('alert')).toContainText('Eminim');
  await iptal.locator('input[name="onay"]').check();
  await iptal.getByRole('button', { name: 'İptal et ve iade et' }).click();
  await expect(page.getByTestId('durum')).toHaveText('İptal edildi');
  expect((await mockCalls()).some((x) => x.path === '/payment/cancel')).toBe(true);
  expect(await stock('deri-bakim-kremi', '', '')).toBe(before + 1);
  await page.close();
});

test('üye olur, favoriye ekler, kayıtlı adresle sipariş verir, yorum yazar', async () => {
  const page = await member.newPage();
  await go(page, '/hesap/kayit');
  await page.locator('#firstName').fill('Ayşe');
  await page.locator('#lastName').fill('Demir');
  await page.locator('#r-email').fill('uye@example.com');
  await page.locator('#r-password').fill('uye-sifre-123');
  await page.getByRole('button', { name: 'Üye ol' }).click();
  await expect(page.getByRole('alert')).toContainText('onayla');
  await page.locator('input[name="kvkk"]').check();
  await page.getByRole('button', { name: 'Üye ol' }).click();
  await page.waitForURL('**/hesap');

  await go(page, '/urun/kulup-yelegi');
  await page.getByTestId('favori').click();
  await expect(page.getByTestId('favori')).toHaveAttribute('aria-pressed', 'true');
  await go(page, '/hesap/favoriler');
  await expect(page.getByTestId('favoriler').getByTestId('urun-karti')).toHaveCount(1);

  await addToCart(page, 'kulup-yelegi', { size: 'M' });
  await checkout(page, { guest: false, result: 'ok' });
  await expect(page.getByTestId('odeme-basarili')).toBeVisible();
  S.memberOrder = (await page.getByTestId('siparis-no').textContent())?.trim();
  await go(page, '/hesap');
  await expect(page.getByTestId('siparislerim')).toContainText(S.memberOrder as string);
  await shot(page, '08-hesap');
  await go(page, '/hesap/adresler');
  await expect(page.getByText('Kazımdirik Mah. 372 Sok. No 5 Daire 3')).toBeVisible();

  const a = await admin.newPage();
  await adminOrder(a, S.memberOrder as string);
  const kargo = a.getByTestId('op-kargola');
  await kargo.locator('#trackingNumber').fill('987654321');
  await kargo.getByRole('button').click();
  await expect(a.getByTestId('durum')).toHaveText('Kargoda');
  await a.getByTestId('op-teslim').getByRole('button').click();
  await expect(a.getByTestId('durum')).toHaveText('Teslim edildi');

  await go(page, '/urun/kulup-yelegi');
  await page.locator('#yorum-body').fill('Deri kalın ve kaliteli, M beden tam oldu.');
  await page.getByRole('button', { name: 'Yorumu gönder' }).click();
  await expect(page.getByText('Yorumun alındı')).toBeVisible();

  await go(a, '/yonetim/yorumlar');
  await a.getByTestId('yorum').first().getByRole('button', { name: 'Yayınla' }).click();
  await expect(a.getByRole('button', { name: 'Yayından kaldır' })).toBeVisible();
  await go(page, '/urun/kulup-yelegi');
  await expect(page.getByText('Deri kalın ve kaliteli, M beden tam oldu.')).toBeVisible();
  await a.close();
  await page.close();
});

test('indirim kodu sepete uygulanır ve ödemeye yansır', async () => {
  const a = await admin.newPage();
  await go(a, '/yonetim/kuponlar');
  const f = a.getByTestId('kupon-formu');
  await f.locator('#code').fill('TEST10');
  await f.locator('#value').fill('10');
  await f.getByRole('button', { name: 'Kodu oluştur' }).click();
  await expect(a.getByTestId('kupon-tablosu')).toContainText('TEST10');
  await a.close();

  const page = await member.newPage();
  await addToCart(page, 'cuzdan-zinciri');
  await go(page, '/sepet');
  await page.locator('#indirim-kodu').fill('test10');
  await page.getByRole('button', { name: 'Uygula' }).click();
  await expect(page.getByTestId('sepet-toplam')).toHaveText('771 TL');
  await checkout(page, { guest: false, result: 'ok' });
  await expect(page.getByTestId('odeme-basarili')).toBeVisible();
  const number = (await page.getByTestId('siparis-no').textContent())?.trim() as string;
  const o = await orderRow(number);
  expect(o.discount_total).toBe(6900);
  expect(o.total).toBe(77100);
  const [c] = await sql`select used_count from discount_codes where code = 'TEST10'`;
  expect(c.used_count).toBe(1);
  await page.close();
});

test('misafir sipariş takibi ve şifre yenileme', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await go(page, '/siparis-takip');
  await page.locator('#number').fill(S.guestOrder as string);
  await page.locator('#email').fill('yanlis@example.com');
  await page.getByRole('button', { name: 'Siparişimi bul' }).click();
  await expect(page.getByRole('alert')).toContainText('bulunamadı');
  await page.locator('#email').fill('misafir@example.com');
  await page.getByRole('button', { name: 'Siparişimi bul' }).click();
  await page.waitForURL(`**/siparis/${S.guestOrder}?t=*`);

  await go(page, '/hesap/sifremi-unuttum');
  await page.locator('#f-email').fill('uye@example.com');
  await page.getByRole('button', { name: 'Yenileme bağlantısı gönder' }).click();
  await expect(page.getByRole('status')).toContainText('bağlantısı gönderdik');
  const [m] = await sql<{ html: string }[]>`select html from email_log where "to" = 'uye@example.com' and subject = 'Şifre yenileme bağlantın' order by created_at desc limit 1`;
  const link = /href="([^"]*sifre-yenile\?t=[^"]+)"/.exec(m.html)?.[1] as string;
  expect(link).toBeTruthy();
  await go(page, link.replace(/&amp;/g, '&'));
  await page.locator('#n-password').fill('yeni-sifre-456');
  await page.getByRole('button', { name: 'Şifreyi kaydet' }).click();
  await page.waitForURL('**/hesap?sifre=yenilendi');
  await expect(page.getByText('Şifren yenilendi.')).toBeVisible();
  await ctx.close();
});

test('yönetici yeni ürün ekler, görsel yükler ve ürün mağazada görünür', async () => {
  const page = await admin.newPage();
  await go(page, '/yonetim/urunler/yeni');
  await page.locator('#pe-name').fill('Test Eldiveni');
  await page.locator('#pe-price').fill('799');
  await page.getByRole('button', { name: 'Renk ekle' }).click();
  await page.getByLabel('Renk adı').fill('Siyah');
  await page.locator('#pe-sizes').fill('M, L');
  await page.locator('#pe-sizes').blur();
  await page.getByLabel('Toplu stok').fill('5');
  await page.getByRole('button', { name: 'Tümüne uygula' }).click();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAACgAAAAyCAIAAACh0Q7HAAAANklEQVR4nO3NIQEAMAgAsPMWGDT9ExIDxFZg0ZVvw19ZxWKxWCwWi8VisVgsFovFYrFYLD4SD3p4AMOtLlctAAAAAElFTkSuQmCC',
    'base64',
  );
  await page.getByTestId('gorsel-sec').setInputFiles({ name: 'eldiven.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.img-item')).toHaveCount(1);
  await shot(page, '21-yonetim-urun-editoru');
  await page.getByTestId('urun-kaydet').click();
  await page.waitForURL(/\/yonetim\/urunler\/[0-9a-f-]+\?kaydedildi=1/);
  await expect(page.getByText('Ürün oluşturuldu.')).toBeVisible();
  const [p] = await sql`select p.slug, (select sum(stock) from variants v where v.product_id = p.id)::int as stock from products p where name = 'Test Eldiveni'`;
  expect(p.slug).toBe('test-eldiveni');
  expect(p.stock).toBe(10);

  await page.locator('#pe-price').fill('749');
  await page.getByTestId('urun-kaydet').click();
  await expect(page.getByTestId('urun-kayit-mesaji')).toHaveText('Ürün kaydedildi.');
  const [imgs] = await sql`select count(*)::int as n from product_images i join products p on p.id = i.product_id where p.name = 'Test Eldiveni'`;
  expect(imgs.n).toBe(1);

  await go(page, '/urun/test-eldiveni');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test Eldiveni');
  await expect(page.getByTestId('urun-fiyat')).toHaveText('749 TL');
  const src = await page.locator('.pv-main img').getAttribute('src');
  expect(src).toContain('/yuklenen/');
  const imgRes = await page.request.get(src as string);
  expect(imgRes.status()).toBe(200);

  await go(page, '/yonetim');
  await shot(page, '22-yonetim-ozet');
  await page.close();
});

test('bilgi sayfaları ve site haritası', async ({ request }) => {
  const page = await guest.newPage();
  await go(page, '/sayfa/mesafeli-satis-sozlesmesi');
  await expect(page.getByRole('heading', { name: 'Mesafeli satış sözleşmesi', exact: true })).toBeVisible();
  await expect(page.getByText('Arda Deri Tekstil - Arda Örnek').first()).toBeVisible();
  await shot(page, '09-sozlesme');
  const sm = await request.get('/sitemap.xml');
  expect(sm.status()).toBe(200);
  expect(await sm.text()).toContain('/urun/kulup-yelegi');
  const cron = await request.get('/api/cron/temizlik', { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(cron.status()).toBe(200);
  await page.close();
});
