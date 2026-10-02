/*
 * Test için sahte iyzico sunucusu. Gerçek iyzico ile aynı kimlik doğrulamayı (IYZWSv2) kontrol eder,
 * ödeme formunu başlatır, ödeme sayfasını taklit eder ve sonucu callbackUrl'e POST eder.
 */
import http from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_PORT || 4010);
const API = process.env.IYZICO_API_KEY;
const SECRET = process.env.IYZICO_SECRET_KEY;
const sessions = new Map();
const calls = [];

const hmac = (d) => createHmac('sha256', SECRET).update(d, 'utf8').digest('hex');
const n = (v) => String(Number(v));
const cents = (v) => Math.round(Number(v) * 100);

function authOk(req, path, body) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('IYZWSv2 ')) return 'başlık yok';
  const dec = Buffer.from(h.slice(8), 'base64').toString('utf8');
  const m = /^apiKey:(.+)&randomKey:(.+)&signature:([0-9a-f]+)$/.exec(dec);
  if (!m) return 'biçim hatalı';
  if (m[1] !== API) return 'apiKey hatalı';
  if (req.headers['x-iyzi-rnd'] !== m[2]) return 'x-iyzi-rnd uyuşmuyor';
  if (hmac(m[2] + path + body) !== m[3]) return 'imza hatalı';
  return '';
}

function send(res, code, obj, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(obj) : obj);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = await readBody(req);
  const p = url.pathname;

  if (req.method === 'GET' && p === '/_kayit') return send(res, 200, calls);
  if (req.method === 'GET' && p === '/_sonuc') {
    const s = sessions.get(url.searchParams.get('token'));
    if (s) s.result = url.searchParams.get('r');
    return send(res, s ? 200 : 404, { ok: !!s });
  }
  const page = /^\/odeme\/([^/]+)$/.exec(p);
  if (req.method === 'GET' && page) {
    const s = sessions.get(page[1]);
    if (!s) return send(res, 404, 'yok', 'text/plain');
    return send(
      res,
      200,
      `<!doctype html><meta charset="utf-8"><title>Sahte iyzico</title><body style="font-family:sans-serif;padding:24px">
<h1>Sahte iyzico ödeme sayfası</h1><p>Tutar: ${s.req.paidPrice} TL, sepet ${s.req.basketId}</p>
<form method="post" action="/odeme/${page[1]}/sonuc?r=ok"><button>Ödemeyi onayla</button></form>
<form method="post" action="/odeme/${page[1]}/sonuc?r=fail"><button>Ödeme başarısız</button></form></body>`,
      'text/html; charset=utf-8',
    );
  }
  const result = /^\/odeme\/([^/]+)\/sonuc$/.exec(p);
  if (req.method === 'POST' && result) {
    const s = sessions.get(result[1]);
    if (!s) return send(res, 404, 'yok', 'text/plain');
    s.result = url.searchParams.get('r');
    return send(
      res,
      200,
      `<!doctype html><meta charset="utf-8"><body><form id="f" method="post" action="${s.req.callbackUrl}"><input type="hidden" name="token" value="${result[1]}"></form><script>document.getElementById('f').submit()</script></body>`,
      'text/html; charset=utf-8',
    );
  }

  if (req.method !== 'POST') return send(res, 404, { status: 'failure', errorMessage: 'yok' });
  const authErr = authOk(req, p, body);
  let json = {};
  try {
    json = JSON.parse(body || '{}');
  } catch {
    /* boş */
  }
  calls.push({ path: p, body: json, authErr });
  if (authErr) {
    console.error('[sahte iyzico] kimlik doğrulama hatası:', authErr, p);
    return send(res, 200, { status: 'failure', errorCode: '1001', errorMessage: `api bilgileri bulunamadı (${authErr})` });
  }

  if (p === '/payment/iyzipos/checkoutform/initialize/auth/ecom') {
    const sum = (json.basketItems || []).reduce((a, i) => a + cents(i.price), 0);
    const missing = ['price', 'paidPrice', 'callbackUrl', 'basketId', 'conversationId'].filter((k) => !json[k]);
    const buyerMissing = ['id', 'name', 'surname', 'identityNumber', 'email', 'gsmNumber', 'registrationAddress', 'city', 'country', 'ip'].filter((k) => !json.buyer?.[k]);
    if (missing.length || buyerMissing.length) return send(res, 200, { status: 'failure', errorCode: '11', errorMessage: `eksik alan: ${[...missing, ...buyerMissing].join(',')}` });
    if (sum !== cents(json.price)) return send(res, 200, { status: 'failure', errorCode: '5', errorMessage: `sepet toplamı (${sum}) fiyatla (${cents(json.price)}) uyuşmuyor` });
    if (!/^\+90\d{10}$/.test(json.buyer.gsmNumber)) return send(res, 200, { status: 'failure', errorCode: '12', errorMessage: 'gsmNumber geçersiz' });
    if ((json.basketItems || []).some((i) => cents(i.price) <= 0)) return send(res, 200, { status: 'failure', errorCode: '13', errorMessage: 'sepet kalemi fiyatı 0 olamaz' });
    const token = `tok-${randomUUID()}`;
    sessions.set(token, { req: json, result: null, paymentId: String(20000000 + sessions.size) });
    return send(res, 200, {
      status: 'success',
      locale: 'tr',
      systemTime: Date.now(),
      conversationId: json.conversationId,
      token,
      tokenExpireTime: 1800,
      paymentPageUrl: `http://localhost:${PORT}/odeme/${token}`,
      checkoutFormContent: '',
      signature: hmac(`${json.conversationId}:${token}`),
    });
  }

  if (p === '/payment/iyzipos/checkoutform/auth/ecom/detail') {
    const s = sessions.get(json.token);
    if (!s) return send(res, 200, { status: 'failure', errorCode: '5', errorMessage: 'Geçersiz token' });
    if (s.result !== 'ok') {
      return send(res, 200, {
        status: 'failure',
        paymentStatus: 'FAILURE',
        errorCode: '10051',
        errorMessage: s.result === 'fail' ? 'Kart limiti yetersiz, yetersiz bakiye' : 'Ödeme tamamlanmadı',
        token: json.token,
        basketId: s.req.basketId,
        conversationId: s.req.conversationId,
      });
    }
    const r = {
      status: 'success',
      locale: 'tr',
      systemTime: Date.now(),
      conversationId: s.req.conversationId,
      price: Number(s.req.price),
      paidPrice: Number(s.req.paidPrice),
      installment: 1,
      paymentId: s.paymentId,
      fraudStatus: 1,
      cardType: 'CREDIT_CARD',
      cardAssociation: 'MASTER_CARD',
      cardFamily: 'Bonus',
      binNumber: '552879',
      lastFourDigits: '0008',
      basketId: s.req.basketId,
      currency: 'TRY',
      itemTransactions: s.req.basketItems.map((i, k) => ({ itemId: i.id, paymentTransactionId: String(30000000 + k), price: Number(i.price), paidPrice: Number(i.price), transactionStatus: 2 })),
      token: json.token,
      paymentStatus: 'SUCCESS',
    };
    r.signature = hmac([r.paymentStatus, r.paymentId, r.currency, r.basketId, r.conversationId, n(r.paidPrice), n(r.price), r.token].join(':'));
    return send(res, 200, r);
  }

  if (p === '/payment/cancel') return send(res, 200, { status: 'success', paymentId: json.paymentId, price: 0, currency: 'TRY' });
  if (p === '/v2/payment/refund') return send(res, 200, { status: 'success', paymentId: json.paymentId, price: Number(json.price), currency: 'TRY' });
  return send(res, 200, { status: 'failure', errorMessage: 'bilinmeyen uç' });
});

server.listen(PORT, () => console.log(`[sahte iyzico] ${PORT} portunda`));
