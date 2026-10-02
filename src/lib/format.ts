/* Tarayıcıda da kullanılabilen biçimlendirme yardımcıları. */

const TZ = 'Europe/Istanbul';

export function formatDate(d: Date | string | null | undefined, withTime = true): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function formatShortDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function istanbulDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  return p;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}`;
}
