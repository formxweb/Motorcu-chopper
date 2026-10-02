import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { istanbulDateKey } from './format';

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const randomToken = (bytes = 24) => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const TR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', I: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

export function slugify(input: string): string {
  const s = input
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'urun';
}

export function newOrderNumber(): string {
  const key = istanbulDateKey(new Date()).replace(/-/g, '').slice(2);
  return `MC${key}${randomInt(10000, 99999)}`;
}

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

export function int(fd: FormData, key: string, fallback = 0): number {
  const n = Number.parseInt(str(fd, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

/** 0 ile başlayan 11 haneli numaraya çevirir: 05xxxxxxxxx */
export function normalizePhone(p: string): string {
  let d = p.replace(/\D/g, '');
  if (d.startsWith('90') && d.length === 12) d = '0' + d.slice(2);
  if (d.length === 10 && !d.startsWith('0')) d = '0' + d;
  return d;
}

export function isValidPhone(p: string): boolean {
  return /^0\d{10}$/.test(normalizePhone(p));
}

export function isUuid(v: string | undefined | null): v is string {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/** Yalnızca site içi yollara yönlendirmeye izin verir. */
export function safeNext(v: string | null | undefined, fallback = '/hesap'): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return fallback;
  return v;
}

export function validTcKimlik(v: string): boolean {
  if (!/^[1-9]\d{10}$/.test(v)) return false;
  const d = v.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (odd * 7 - even) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return ((d10 + 10) % 10) === d[9] && d11 === d[10];
}
