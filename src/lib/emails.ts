import type { orderItems, orders } from '@/db/schema';
import { appUrl } from './env';
import { formatDate } from './format';
import { formatTL } from './money';
import type { StoreSettings } from './settings-defaults';
import { STATUS_LABEL } from './status';

type Order = typeof orders.$inferSelect;
type Item = typeof orderItems.$inferSelect;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function orderLink(o: Pick<Order, 'number' | 'accessToken'>): string {
  return `${appUrl()}/siparis/${o.number}?t=${o.accessToken}`;
}

export function layout(s: StoreSettings, title: string, body: string): string {
  const contact = [s.contactPhone, s.contactEmail].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#efebe6;font-family:Arial,Helvetica,sans-serif;color:#221a15">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efebe6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#1b1512;padding:20px 28px;color:#f2e9de">
<div style="font-family:Georgia,serif;font-size:24px;line-height:1">${esc(s.storeName)}</div>
<div style="font-size:12px;color:#d6b062;margin-top:4px">${esc(s.tagline)}</div></td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:18px 28px;background:#f7f4f0;font-size:12px;color:#6b6259;line-height:1.6">
${contact ? contact + '<br>' : ''}${s.seller.title ? esc(s.seller.title) + (s.seller.address ? ', ' + esc(s.seller.address) : '') : ''}
</td></tr></table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#b8902f;color:#1b1512;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:4px">${esc(label)}</a></p>`;
}

function itemsTable(items: Item[]): string {
  const rows = items
    .map((i) => {
      const opts = [i.color && `${i.colorLabel}: ${i.color}`, i.size && `${i.sizeLabel}: ${i.size}`, ...i.customization.map((c) => `${c.label}: "${c.value}"`)]
        .filter(Boolean)
        .map((x) => esc(String(x)))
        .join('<br>');
      return `<tr><td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top"><strong>${esc(i.productName)}</strong>${opts ? `<br><span style="color:#6b6259;font-size:13px">${opts}</span>` : ''}</td>
<td style="padding:10px 0;border-bottom:1px solid #eee;text-align:center;vertical-align:top;white-space:nowrap">${i.quantity} adet</td>
<td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;vertical-align:top;white-space:nowrap">${formatTL(i.lineTotal)}</td></tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}</table>`;
}

function totals(o: Order): string {
  const row = (l: string, v: string, b = false) =>
    `<tr><td style="padding:4px 0;${b ? 'font-weight:bold;font-size:16px' : ''}">${l}</td><td style="padding:4px 0;text-align:right;${b ? 'font-weight:bold;font-size:16px' : ''}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:8px">
${row('Ara toplam', formatTL(o.subtotal))}
${o.discountTotal ? row(`İndirim${o.discountCode ? ` (${esc(o.discountCode)})` : ''}`, '−' + formatTL(o.discountTotal)) : ''}
${row('Kargo', o.shippingTotal ? formatTL(o.shippingTotal) : 'Ücretsiz')}
${row('Toplam', formatTL(o.total), true)}
${o.paidTotal && o.paidTotal !== o.total ? row(`Karttan çekilen${o.installment && o.installment > 1 ? ` (${o.installment} taksit)` : ''}`, formatTL(o.paidTotal)) : ''}
</table>`;
}

function addressBlock(o: Order): string {
  const a = o.shippingAddress;
  return `<p style="font-size:14px;line-height:1.5;margin:0"><strong>Teslimat adresi</strong><br>${esc(a.firstName)} ${esc(a.lastName)}<br>${esc(a.line)}<br>${esc(a.district)} / ${esc(a.city)}<br>${esc(a.phone)}</p>`;
}

export function orderConfirmationEmail(s: StoreSettings, o: Order, items: Item[]) {
  const personalized = items.some((i) => i.isPersonalized);
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Siparişin alındı</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Merhaba ${esc(o.shippingAddress.firstName)}, ödemen onaylandı. Sipariş numaran <strong>${esc(o.number)}</strong>.
${personalized ? `Kişiye özel ürünler ${esc(s.personalizedDays)}, diğer ürünler ${esc(s.shipDays)} içinde kargoya verilir.` : `Siparişin ${esc(s.shipDays)} içinde kargoya verilir.`}</p>
${itemsTable(items)}${totals(o)}
<div style="height:16px"></div>${addressBlock(o)}
${button(orderLink(o), 'Siparişini takip et')}
<p style="font-size:12px;color:#6b6259;line-height:1.6">Ön bilgilendirme formu ve mesafeli satış sözleşmesi bu e-postanın ekindedir.</p>`;
  return { subject: `Siparişin alındı (${o.number})`, html: layout(s, 'Siparişin alındı', body) };
}

export function adminNewOrderEmail(s: StoreSettings, o: Order, items: Item[]) {
  const body = `<h1 style="font-size:20px;margin:0 0 8px">Yeni sipariş: ${esc(o.number)}</h1>
<p style="font-size:14px;margin:0 0 12px">${esc(o.shippingAddress.firstName)} ${esc(o.shippingAddress.lastName)} · ${esc(o.email)} · ${esc(o.phone)}</p>
${itemsTable(items)}${totals(o)}
${o.note ? `<p style="font-size:14px;background:#fff6dd;padding:10px;border-radius:4px"><strong>Müşteri notu:</strong> ${esc(o.note)}</p>` : ''}
${button(`${appUrl()}/yonetim/siparisler/${o.id}`, 'Siparişi panelde aç')}`;
  return { subject: `Yeni sipariş ${o.number} (${formatTL(o.total)})`, html: layout(s, 'Yeni sipariş', body) };
}

export function shippedEmail(s: StoreSettings, o: Order, carrierName: string) {
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Siparişin kargoya verildi</h1>
<p style="font-size:15px;line-height:1.6">Merhaba ${esc(o.shippingAddress.firstName)}, <strong>${esc(o.number)}</strong> numaralı siparişin ${esc(carrierName)} ile yola çıktı.</p>
<p style="font-size:15px">Takip numarası: <strong>${esc(o.trackingNumber)}</strong></p>
${o.trackingUrl ? button(o.trackingUrl, 'Kargonu takip et') : ''}
<p style="font-size:14px"><a href="${esc(orderLink(o))}" style="color:#8a6619">Sipariş detayını gör</a></p>`;
  return { subject: `Siparişin kargoda (${o.number})`, html: layout(s, 'Siparişin kargoda', body) };
}

export function deliveredEmail(s: StoreSettings, o: Order) {
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Siparişin teslim edildi</h1>
<p style="font-size:15px;line-height:1.6">Merhaba ${esc(o.shippingAddress.firstName)}, <strong>${esc(o.number)}</strong> numaralı siparişin teslim edildi. İyi sürüşler!</p>
<p style="font-size:14px;line-height:1.6">Ürünü beğendiysen üye hesabından yorum yazabilirsin. Bir sorun varsa ${s.returnDays} gün içinde sipariş sayfasından iade talebi oluşturabilirsin.</p>
${button(orderLink(o), 'Sipariş sayfasını aç')}`;
  return { subject: `Siparişin teslim edildi (${o.number})`, html: layout(s, 'Teslim edildi', body) };
}

export function cancelledEmail(s: StoreSettings, o: Order, refunded: number, reason: string) {
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Siparişin iptal edildi</h1>
<p style="font-size:15px;line-height:1.6">Merhaba ${esc(o.shippingAddress.firstName)}, <strong>${esc(o.number)}</strong> numaralı siparişin iptal edildi.${reason ? ' ' + esc(reason) : ''}</p>
${refunded ? `<p style="font-size:15px">${formatTL(refunded)} kartına iade edildi. Tutarın hesabına geçmesi bankana göre birkaç iş günü sürebilir.</p>` : ''}
${button(orderLink(o), 'Sipariş sayfasını aç')}`;
  return { subject: `Siparişin iptal edildi (${o.number})`, html: layout(s, 'İptal edildi', body) };
}

export function refundedEmail(s: StoreSettings, o: Order, amount: number) {
  const body = `<h1 style="font-size:22px;margin:0 0 8px">İaden yapıldı</h1>
<p style="font-size:15px;line-height:1.6">Merhaba ${esc(o.shippingAddress.firstName)}, <strong>${esc(o.number)}</strong> numaralı siparişin için ${formatTL(amount)} kartına iade edildi. Tutarın hesabına geçmesi bankana göre birkaç iş günü sürebilir.</p>
${button(orderLink(o), 'Sipariş sayfasını aç')}`;
  return { subject: `İaden yapıldı (${o.number})`, html: layout(s, 'İade', body) };
}

export function orderUpdateEmail(s: StoreSettings, o: Order, message: string) {
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Siparişinde güncelleme var</h1>
<p style="font-size:15px;line-height:1.6">Merhaba ${esc(o.shippingAddress.firstName)}, <strong>${esc(o.number)}</strong> numaralı siparişinle ilgili not:</p>
<p style="font-size:15px;line-height:1.6;background:#f7f4f0;padding:12px;border-radius:4px">${esc(message)}</p>
<p style="font-size:14px">Durum: ${esc(STATUS_LABEL[o.status])}</p>
${button(orderLink(o), 'Sipariş sayfasını aç')}`;
  return { subject: `Siparişin hakkında (${o.number})`, html: layout(s, 'Sipariş güncellemesi', body) };
}

export function adminRequestEmail(s: StoreSettings, o: Order, kind: 'cancel' | 'return', note: string) {
  const title = kind === 'cancel' ? 'İptal talebi' : 'İade talebi';
  const body = `<h1 style="font-size:20px;margin:0 0 8px">${title}: ${esc(o.number)}</h1>
<p style="font-size:14px">${esc(o.shippingAddress.firstName)} ${esc(o.shippingAddress.lastName)} · ${esc(o.email)} · ${esc(o.phone)}</p>
<p style="font-size:14px;background:#fff6dd;padding:10px;border-radius:4px">${esc(note || 'Not yazılmadı.')}</p>
${button(`${appUrl()}/yonetim/siparisler/${o.id}`, 'Siparişi panelde aç')}`;
  return { subject: `${title}: ${o.number}`, html: layout(s, title, body) };
}

export function passwordResetEmail(s: StoreSettings, name: string, link: string) {
  const body = `<h1 style="font-size:22px;margin:0 0 8px">Şifreni yenile</h1>
<p style="font-size:15px;line-height:1.6">Merhaba ${esc(name || '')}, şifreni yenilemek için aşağıdaki bağlantıyı kullan. Bağlantı 1 saat geçerli.</p>
${button(link, 'Yeni şifre belirle')}
<p style="font-size:13px;color:#6b6259">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin, şifren değişmez.</p>`;
  return { subject: 'Şifre yenileme bağlantın', html: layout(s, 'Şifre yenileme', body) };
}

export function contractsAttachment(o: Pick<Order, 'contractsHtml' | 'number' | 'createdAt'>) {
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Sözleşmeler ${esc(o.number)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;max-width:800px;margin:24px auto;padding:0 16px;line-height:1.55;color:#222}h1{font-size:20px}h2{font-size:16px;margin-top:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left;font-size:13px}</style></head>
<body><p style="color:#666;font-size:12px">Sipariş ${esc(o.number)}, ${esc(formatDate(o.createdAt))}</p>${o.contractsHtml}</body></html>`;
  return { filename: `sozlesmeler-${o.number}.html`, content: html, contentType: 'text/html; charset=utf-8' };
}
