/*
 * Veritabanı adresini ortam değişkenlerinden bulur.
 * Elle girilen DATABASE_URL, Vercel'in Neon/Postgres eklentisinin koyduğu
 * POSTGRES_URL / DATABASE_URL_UNPOOLED adları da kabul edilir.
 * Bu dosyada yol takma adı (@/) kullanılmaz: kurulum betiği de içe aktarıyor.
 */

/* postgres.js'in tanımadığı, libpq'ya özel parametreler. Adreste kalırlarsa sunucuya
   bilinmeyen ayar olarak gider ve bağlantı reddedilir (ör. Neon'un channel_binding=require'ı). */
const DROP = ['sslmode', 'channel_binding', 'sslrootcert', 'sslcert', 'sslkey', 'sslnegotiation', 'gssencmode', 'pgbouncer', 'connection_limit', 'pool_timeout', 'schema'];

function pick(names: string[]): { name: string; value: string } | undefined {
  for (const name of names) {
    const value = (process.env[name] || '').trim().replace(/^["']+|["']+$/g, '');
    if (value) return { name, value };
  }
  return undefined;
}

/** Uygulamanın kullandığı (havuzlu) bağlantı adresi. */
export function pooledDatabaseUrl() {
  return pick(['DATABASE_URL', 'POSTGRES_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING']);
}

/** Kurulum ve tablo göçleri için doğrudan bağlantı adresi (yoksa havuzlu adres). */
export function directDatabaseUrl() {
  return pick(['DIRECT_DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'POSTGRES_URL']);
}

/** Adresi postgres.js için temizler ve SSL gerekip gerekmediğini söyler. */
export function connectionOptions(raw: string): { url: string; ssl: false | 'require' } {
  let url = raw;
  let sslOff = process.env.DATABASE_SSL === 'false';
  try {
    const u = new URL(raw);
    if (u.searchParams.get('sslmode') === 'disable') sslOff = true;
    for (const k of DROP) u.searchParams.delete(k);
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(u.hostname)) sslOff = true;
    url = u.toString();
  } catch {
    /* biçim okunamazsa olduğu gibi denenir, hata mesajı sürücüden gelir */
  }
  return { url, ssl: sslOff ? false : 'require' };
}
