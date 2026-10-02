export function appUrl(): string {
  let raw =
    (process.env.APP_URL || '').trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'http://localhost:3000';
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    return new URL(raw).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export function isHttps(): boolean {
  return appUrl().startsWith('https://');
}

export function iyzicoConfig() {
  const baseUrl = (process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com').replace(/\/$/, '');
  return {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    baseUrl,
    sandbox: baseUrl !== 'https://api.iyzipay.com',
  };
}

export function iyzicoReady(): boolean {
  const c = iyzicoConfig();
  return !!(c.apiKey && c.secretKey);
}

export function smtpReady(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function supabaseStorage() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    key: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_BUCKET || 'urunler',
  };
}

/** Ürün fotoğraflarının nereye yükleneceği: Supabase Storage, yerel klasör (geliştirme) veya veritabanı. */
export function storageMode(): 'supabase' | 'local' | 'database' {
  const s = supabaseStorage();
  if (s.url && s.key) return 'supabase';
  if (process.env.STORAGE_LOCAL === 'true' || process.env.NODE_ENV !== 'production') return 'local';
  return 'database';
}
