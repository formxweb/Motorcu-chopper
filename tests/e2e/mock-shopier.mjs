/*
 * Test için sahte Shopier ödeme sayfası. Gerçek Shopier gibi imzalı formu kabul eder (api_pay4.php),
 * imzayı ve zorunlu alanları kontrol eder, sonucu imzalı olarak geri dönüş adresine POST eder.
 */
import http from 'node:http';
import { createHmac, randomInt } from 'node:crypto';

const PORT = Number(process.env.MOCK_SHOPIER_PORT || 4020);
const KEY = process.env.MOCK_SHOPIER_KEY || 'mock-shopier-kullanici';
const SECRET = process.env.MOCK_SHOPIER_SECRET || 'mock-shopier-sifre-123';
const FALLBACK_CALLBACK = process.env.MOCK_SHOPIER_CALLBACK || 'http://localhost:3000/api/odeme/shopier/geri-donus';
const REQUIRED = [
  'API_key', 'website_index', 'platform_order_id', 'product_name', 'product_type', 'buyer_name', 'buyer_surname', 'buyer_email',
  'buyer_account_age', 'buyer_id_nr', 'buyer_phone', 'billing_address', 'billing_city', 'billing_country', 'shipping_address',
  'shipping_city', 'shipping_country', 'total_order_value', 'currency', 'platform', 'is_in_frame', 'current_language',
  'modul_version', 'random_nr', 'signature',
];

const sign = (d, secret = SECRET) => createHmac('sha256', secret).update(d, 'utf8').digest('base64');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const requests = [];
const sessions = new Map();

function send(res, code, body, type = 'text/html; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b));
  });
}

function check(f) {
  const missing = REQUIRED.filter((k) => !(k in f) || (f[k] === '' && !['billing_postcode', 'shipping_postcode'].includes(k)));
  if (missing.length) return `eksik alan: ${missing.join(', ')}`;
  if (f.API_key !== KEY) return 'API_key hatalı';
  if (sign(`${f.random_nr}${f.platform_order_id}${f.total_order_value}${f.currency}`) !== f.signature) return 'imza hatalı';
  if (!/^\d+\.\d{2}$/.test(f.total_order_value)) return 'tutar biçimi hatalı';
  if (!/^5\d{9}$/.test(f.buyer_phone)) return 'telefon 10 haneli olmalı';
  if (!/^[1-5]$/.test(f.website_index)) return 'website_index hatalı';
  return '';
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const raw = await readBody(req);

  if (req.method === 'GET' && p === '/_kayit') return send(res, 200, requests, 'application/json');

  if (req.method === 'POST' && p === '/ShowProduct/api_pay4.php') {
    const f = Object.fromEntries(new URLSearchParams(raw));
    const err = check(f);
    requests.push({ fields: f, error: err });
    if (err) return send(res, 400, `<!doctype html><meta charset="utf-8"><h1>Shopier hata</h1><p data-hata>${esc(err)}</p>`);
    const id = String(randomInt(10_000_000, 99_999_999));
    sessions.set(id, f);
    return send(
      res,
      200,
      `<!doctype html><meta charset="utf-8"><title>Sahte Shopier</title><body style="font-family:sans-serif;padding:24px">
<h1>Sahte Shopier ödeme sayfası</h1><p>Sipariş ${esc(f.platform_order_id)}, tutar ${esc(f.total_order_value)} TL</p>
<form method="post" action="/odeme/${id}?r=success"><button>Ödemeyi onayla</button></form>
<form method="post" action="/odeme/${id}?r=failed"><button>Ödeme başarısız</button></form>
<form method="post" action="/odeme/${id}?r=sahte"><button>Sahte imzalı dönüş</button></form></body>`,
    );
  }

  const m = /^\/odeme\/(\d+)$/.exec(p);
  if (req.method === 'POST' && m) {
    const f = sessions.get(m[1]);
    if (!f) return send(res, 404, 'yok', 'text/plain');
    const r = url.searchParams.get('r');
    const status = r === 'failed' ? 'failed' : 'success';
    const secret = r === 'sahte' ? 'yanlis-sifre' : SECRET;
    const out = {
      platform_order_id: f.platform_order_id,
      API_key: f.API_key,
      status,
      installment: '0',
      payment_id: status === 'success' ? String(randomInt(100_000_000, 999_999_999)) : '',
      random_nr: f.random_nr,
      signature: sign(`${f.random_nr}${f.platform_order_id}`, secret),
    };
    const inputs = Object.entries(out)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`)
      .join('');
    return send(
      res,
      200,
      `<!doctype html><meta charset="utf-8"><body><form id="f" method="post" action="${esc(f.callback || FALLBACK_CALLBACK)}">${inputs}</form><script>document.getElementById('f').submit()</script></body>`,
    );
  }

  send(res, 404, 'bulunamadı', 'text/plain');
});

server.listen(PORT, () => console.log(`sahte Shopier ${PORT} portunda`));
