/* Tüm tutarlar kuruş (tam sayı) olarak tutulur. Tarayıcıda da kullanılabilir. */

const whole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatTL(kurus: number): string {
  const v = kurus / 100;
  return (Number.isInteger(v) ? whole.format(v) : cents.format(v)) + ' TL';
}

/** iyzico'ya giden tutar: "3950.00" */
export function toIyzicoAmount(kurus: number): string {
  return (kurus / 100).toFixed(2);
}

/** "1.450", "1450,50", "1450.50", "₺1.450" → kuruş. Geçersizse null. */
export function parseTL(input: string): number | null {
  const s = input.trim().replace(/\s|TL|₺/gi, '');
  if (!s) return null;
  let norm = s;
  if (s.includes(',')) norm = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) norm = s.replace(/\./g, '');
  const n = Number(norm);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Kuruşu formdaki giriş alanı için "1450" veya "1450,50" yapar. */
export function kurusToInput(kurus: number | null | undefined): string {
  if (kurus === null || kurus === undefined) return '';
  const v = kurus / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
}

export function discountPercent(price: number, compareAt: number | null | undefined): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
