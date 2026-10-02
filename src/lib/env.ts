export function appUrl(): string {
  const raw =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
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

export function storageMode(): 'supabase' | 'local' | 'none' {
  const s = supabaseStorage();
  if (s.url && s.key) return 'supabase';
  if (process.env.STORAGE_LOCAL === 'true' || process.env.NODE_ENV !== 'production') return 'local';
  return 'none';
}
