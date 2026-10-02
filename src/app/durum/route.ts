import { NextResponse } from 'next/server';
import { getSql } from '@/db';
import { pooledDatabaseUrl } from '@/db/url';
import { appUrl, iyzicoConfig, smtpReady, storageMode } from '@/lib/env';

export const dynamic = 'force-dynamic';

/* Kurulum kontrolü: hangi ayarların eksik olduğunu gösterir. Gizli değer içermez. */

function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const parts = u.hostname.split('.');
    return `${parts.length > 3 ? '…' + parts.slice(-3).join('.') : u.hostname}:${u.port || '5432'}`;
  } catch {
    return 'adres okunamadı (biçim hatalı)';
  }
}

function clean(msg: string): string {
  return msg.replace(/postgres(ql)?:\/\/[^\s]+/gi, '[adres]').slice(0, 300);
}

export async function GET() {
  const found = pooledDatabaseUrl();
  const dbUrl = found?.value;
  const db: Record<string, unknown> = { tanimli: !!dbUrl, degisken: found?.name ?? '', sunucu: hostOf(dbUrl) };
  if (dbUrl) {
    try {
      const sql = getSql();
      await sql`select 1`;
      db.baglanti = 'tamam';
      const t = await sql<{ n: number }[]>`select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name in ('settings', 'products', 'orders', 'users')`;
      db.tablolar = t[0]?.n === 4 ? 'kurulu' : 'eksik (derleme sırasında kurulum çalışmamış, Redeploy gerekli)';
      if (t[0]?.n === 4) {
        const p = await sql<{ n: number }[]>`select count(*)::int as n from products`;
        const a = await sql<{ n: number }[]>`select count(*)::int as n from users where role = 'admin'`;
        db.urun_sayisi = p[0]?.n ?? 0;
        db.yonetici_sayisi = a[0]?.n ?? 0;
      }
    } catch (e) {
      const err = e as { code?: string; message?: string };
      db.baglanti = 'hata';
      db.hata_kodu = err.code ?? '';
      db.hata = clean(err.message ?? String(e));
    }
  }
  const iz = iyzicoConfig();
  return NextResponse.json(
    {
      site_adresi: appUrl(),
      app_url_tanimli: !!process.env.APP_URL,
      veritabani: db,
      iyzico: { anahtar: !!(iz.apiKey && iz.secretKey), mod: iz.sandbox ? 'test' : 'canlı', adres: iz.baseUrl },
      eposta_smtp: smtpReady(),
      gorsel_depolama: storageMode(),
      yonetici_eposta_tanimli: !!process.env.ADMIN_EMAIL,
      cron_secret_tanimli: !!process.env.CRON_SECRET,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
