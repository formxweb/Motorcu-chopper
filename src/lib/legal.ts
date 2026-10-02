import { formatDate } from './format';
import { formatTL } from './money';
import type { StoreSettings } from './settings-defaults';

/*
 * Yasal metin şablonları. 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği'ne göre hazırlanmıştır,
 * yayına almadan önce bir avukata kontrol ettirmeniz önerilir.
 */

function e(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

function filled(v: string, label: string): string {
  return v ? e(v) : `<mark>[${e(label)}: Yönetim &gt; Ayarlar'dan doldurun]</mark>`;
}

export type ContractItem = {
  name: string;
  options: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPersonalized: boolean;
};

export type ContractBuyer = { name: string; email: string; phone: string; address: string };

export type ContractContext = {
  settings: StoreSettings;
  buyer: ContractBuyer | null;
  items: ContractItem[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  date: Date;
  orderNumber?: string;
};

function buyerField(ctx: ContractContext, key: keyof ContractBuyer, placeholder: string): string {
  if (ctx.buyer) return e(ctx.buyer[key] || '-');
  return `<span data-alan="${key}">${e(placeholder)}</span>`;
}

function sellerBlock(s: StoreSettings): string {
  return `<table><tbody>
<tr><th>Unvan</th><td>${filled(s.seller.title, 'Satıcı unvanı')}</td></tr>
<tr><th>Adres</th><td>${filled(s.seller.address, 'Satıcı adresi')}</td></tr>
<tr><th>Telefon</th><td>${filled(s.contactPhone, 'Telefon')}</td></tr>
<tr><th>E-posta</th><td>${filled(s.contactEmail, 'E-posta')}</td></tr>
<tr><th>Vergi dairesi / No</th><td>${filled(s.seller.taxOffice, 'Vergi dairesi')} / ${filled(s.seller.taxNumber, 'Vergi no')}</td></tr>
${s.seller.mersis ? `<tr><th>MERSİS No</th><td>${e(s.seller.mersis)}</td></tr>` : ''}
${s.seller.kep ? `<tr><th>KEP adresi</th><td>${e(s.seller.kep)}</td></tr>` : ''}
</tbody></table>`;
}

function buyerBlock(ctx: ContractContext): string {
  return `<table><tbody>
<tr><th>Ad soyad</th><td>${buyerField(ctx, 'name', 'Sipariş formunda yazdığın ad soyad')}</td></tr>
<tr><th>Teslimat adresi</th><td>${buyerField(ctx, 'address', 'Sipariş formunda yazdığın adres')}</td></tr>
<tr><th>Telefon</th><td>${buyerField(ctx, 'phone', 'Sipariş formunda yazdığın telefon')}</td></tr>
<tr><th>E-posta</th><td>${buyerField(ctx, 'email', 'Sipariş formunda yazdığın e-posta')}</td></tr>
</tbody></table>`;
}

function itemsBlock(ctx: ContractContext): string {
  const rows = ctx.items
    .map(
      (i) =>
        `<tr><td>${e(i.name)}${i.options ? `<br><small>${e(i.options)}</small>` : ''}${i.isPersonalized ? '<br><small>Kişiye özel üretim</small>' : ''}</td><td>${i.quantity}</td><td>${formatTL(i.unitPrice)}</td><td>${formatTL(i.lineTotal)}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Ürün</th><th>Adet</th><th>Birim fiyat (KDV dahil)</th><th>Tutar (KDV dahil)</th></tr></thead><tbody>${rows}</tbody></table>
<table><tbody>
<tr><th>Ara toplam</th><td>${formatTL(ctx.subtotal)}</td></tr>
${ctx.discountTotal ? `<tr><th>İndirim</th><td>−${formatTL(ctx.discountTotal)}</td></tr>` : ''}
<tr><th>Kargo bedeli</th><td>${ctx.shippingTotal ? formatTL(ctx.shippingTotal) : 'Ücretsiz'}</td></tr>
<tr><th>Toplam (KDV dahil)</th><td><strong>${formatTL(ctx.total)}</strong></td></tr>
<tr><th>Ödeme şekli</th><td>Kredi kartı / banka kartı (iyzico güvenli ödeme altyapısı)</td></tr>
</tbody></table>`;
}

function hasPersonalized(ctx: ContractContext) {
  return ctx.items.some((i) => i.isPersonalized);
}

export function preliminaryInfoHtml(ctx: ContractContext): string {
  const s = ctx.settings;
  return `<h1>Ön Bilgilendirme Formu</h1>
<p>Bu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, sözleşme kurulmadan önce alıcıyı bilgilendirmek için hazırlanmıştır.${ctx.orderNumber ? ` Sipariş no: <strong>${e(ctx.orderNumber)}</strong>.` : ''} Tarih: ${e(formatDate(ctx.date))}.</p>
<h2>1. Satıcı bilgileri</h2>${sellerBlock(s)}
<h2>2. Alıcı bilgileri</h2>${buyerBlock(ctx)}
<h2>3. Ürünler, fiyatlar ve ödeme</h2>${itemsBlock(ctx)}
<p>Fiyatlara KDV dahildir. Kart ile ödemede taksit seçilirse bankanın uyguladığı vade farkı ödeme sayfasında gösterilir.</p>
<h2>4. Teslimat</h2>
<p>Ürünler alıcının belirttiği teslimat adresine anlaşmalı kargo firmasıyla gönderilir. Stoktaki ürünler ödemenin onayından sonra ${e(s.shipDays)} içinde, kişiye özel üretilen ürünler ${e(s.personalizedDays)} içinde kargoya verilir. Teslim süresi hiçbir durumda siparişten itibaren 30 günü geçemez.</p>
<h2>5. Cayma hakkı</h2>
<p>Alıcı, ürünü teslim aldığı günden itibaren ${s.returnDays} gün içinde hiçbir gerekçe göstermeden ve cezai şart ödemeden sözleşmeden cayabilir. Cayma bildirimi; sipariş sayfasındaki "İade talebi oluştur" bölümünden, ${filled(s.contactEmail, 'E-posta')} adresine e-posta göndererek veya yazılı olarak satıcının adresine yapılabilir.</p>
<p>Cayma hakkı kullanıldığında ürün, bildirimden itibaren 10 gün içinde satıcıya geri gönderilir. Ürün bedeli ve varsa teslimat masrafı, cayma bildiriminin satıcıya ulaşmasından itibaren en geç 14 gün içinde, ödemenin yapıldığı karta iade edilir.</p>
${hasPersonalized(ctx) ? `<p><strong>Önemli:</strong> Siparişinizdeki kişiye özel ürünler (isim, yazı veya arma işlemesi yapılan ürünler) Mesafeli Sözleşmeler Yönetmeliği md. 15/1-ç uyarınca alıcının istekleri doğrultusunda hazırlandığından bu ürünlerde cayma hakkı kullanılamaz.</p>` : ''}
<h2>6. Şikâyet ve itirazlar</h2>
<p>Alıcı, şikâyet ve itirazlarını Ticaret Bakanlığı'nca her yıl ilan edilen parasal sınırlar dahilinde yerleşim yerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyeti'ne veya Tüketici Mahkemesi'ne yapabilir.</p>`;
}

export function distanceSalesHtml(ctx: ContractContext): string {
  const s = ctx.settings;
  return `<h1>Mesafeli Satış Sözleşmesi</h1>
<h2>Madde 1. Taraflar</h2>
<p><strong>Satıcı</strong></p>${sellerBlock(s)}
<p><strong>Alıcı</strong></p>${buyerBlock(ctx)}
<h2>Madde 2. Konu</h2>
<p>Bu sözleşmenin konusu, alıcının satıcıya ait ${e(s.storeName)} internet sitesinden elektronik ortamda siparişini verdiği, aşağıda nitelikleri ve satış fiyatı belirtilen ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.${ctx.orderNumber ? ` Sipariş no: <strong>${e(ctx.orderNumber)}</strong>.` : ''}</p>
<h2>Madde 3. Ürünler ve bedel</h2>${itemsBlock(ctx)}
<h2>Madde 4. Genel hükümler</h2>
<p>4.1. Alıcı, ürünlerin temel nitelikleri, satış fiyatı, ödeme şekli ve teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini kabul eder.</p>
<p>4.2. Sözleşme, alıcının siparişi onaylayıp ödemenin gerçekleşmesiyle kurulur. Ödemenin gerçekleşmemesi veya banka tarafından iptal edilmesi halinde satıcının ürünü teslim yükümlülüğü sona erer.</p>
<p>4.3. Satıcı, ürünü sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleriyle teslim etmekle yükümlüdür.</p>
<p>4.4. Satıcı, haklı bir sebebe dayanarak sözleşmeden doğan ifa yükümlülüğünü yerine getiremezse bunu öğrendiği tarihten itibaren 3 gün içinde alıcıya bildirir ve tahsil edilen tutarı 14 gün içinde iade eder.</p>
<h2>Madde 5. Teslimat</h2>
<p>Ürün, alıcının bildirdiği adrese kargo ile teslim edilir. Stoktaki ürünler ${e(s.shipDays)}, kişiye özel ürünler ${e(s.personalizedDays)} içinde kargoya verilir; teslim süresi 30 günü aşamaz. Alıcı, teslim sırasında paketi kontrol etmeli, hasarlı paketi kargo görevlisine tutanak tutturarak teslim almamalıdır.</p>
<h2>Madde 6. Cayma hakkı</h2>
<p>Alıcı, ürünün kendisine veya gösterdiği kişiye teslim tarihinden itibaren ${s.returnDays} gün içinde gerekçe göstermeksizin cayma hakkını kullanabilir. Bildirim, sipariş sayfasındaki iade talebi bölümünden veya ${filled(s.contactEmail, 'E-posta')} adresine yazılı olarak yapılır. Alıcı, ürünü bildirimden itibaren 10 gün içinde, faturası ve tüm aksesuarlarıyla birlikte satıcıya gönderir. Satıcı, bildirimin ulaşmasından itibaren 14 gün içinde ürün bedelini ve teslimat masrafını ödemenin yapıldığı karta iade eder.</p>
<h2>Madde 7. Cayma hakkı kullanılamayacak ürünler</h2>
<p>Alıcının istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünlerde (isim, yazı, arma işlemesi yapılan veya özel ölçüyle dikilen ürünler) Mesafeli Sözleşmeler Yönetmeliği md. 15/1-ç uyarınca cayma hakkı kullanılamaz. Bu ürünlerin ayıplı olması halinde alıcının 6502 sayılı Kanun'dan doğan hakları saklıdır.</p>
<h2>Madde 8. Ayıplı ürün</h2>
<p>Teslim edilen ürünün ayıplı olması halinde alıcı, 6502 sayılı Kanun'un 11. maddesindeki seçimlik haklarını (sözleşmeden dönme, bedel indirimi, ücretsiz onarım, ayıpsız misli ile değişim) kullanabilir.</p>
<h2>Madde 9. Uyuşmazlıkların çözümü</h2>
<p>Bu sözleşmeden doğan uyuşmazlıklarda Ticaret Bakanlığı'nca ilan edilen parasal sınırlar dahilinde Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir.</p>
<h2>Madde 10. Yürürlük</h2>
<p>Alıcı, siparişi onaylayarak bu sözleşmenin tüm koşullarını kabul etmiş sayılır. Sözleşme, siparişin onaylandığı ${e(formatDate(ctx.date))} tarihinde elektronik ortamda kurulmuştur ve bir kopyası alıcının e-posta adresine gönderilir.</p>`;
}

export function contractsHtml(ctx: ContractContext): string {
  return preliminaryInfoHtml(ctx) + '<hr>' + distanceSalesHtml(ctx);
}

/* ---------- Bilgi sayfaları ---------- */

export type InfoPage = { slug: string; title: string; description: string; html: (s: StoreSettings) => string };

function sellerLine(s: StoreSettings): string {
  return `${filled(s.seller.title, 'Satıcı unvanı')}, ${filled(s.seller.address, 'Satıcı adresi')}`;
}

export const INFO_PAGES: InfoPage[] = [
  {
    slug: 'hakkimizda',
    title: 'Hakkımızda',
    description: 'Motorcu yelekleri, kulüp yelekleri ve kişiye özel arma işleri.',
    html: (s) => `<p>${e(s.storeName)}, motor kullananlar için deri ve kot yelek, kulüp yeleği, sırt arması ve sürüş ekipmanı hazırlar. Yeleklerimizi kalın büyükbaş deriden ve kalın kottan seçiyor, armaları nakış makinesinde işliyoruz.</p>
<p>Kulübünün adını sırtına işletmek, yeleğine isim arması diktirmek ya da özel ölçüde yelek yaptırmak istersen siparişini siteden verebilir, sorularını ${e(s.contactPhone)} numarasından sorabilirsin.</p>`,
  },
  {
    slug: 'iletisim',
    title: 'İletişim',
    description: 'Telefon, e-posta ve satıcı bilgileri.',
    html: (s) => `<table><tbody>
<tr><th>Telefon / WhatsApp</th><td>${filled(s.contactPhone, 'Telefon')}</td></tr>
<tr><th>E-posta</th><td>${filled(s.contactEmail, 'E-posta')}</td></tr>
<tr><th>Çalışma saatleri</th><td>${e(s.workingHours)}</td></tr>
${s.instagram ? `<tr><th>Instagram</th><td><a href="${e(s.instagram)}" target="_blank" rel="noopener">${e(s.instagram.replace(/^https?:\/\/(www\.)?/, ''))}</a></td></tr>` : ''}
</tbody></table>
<h2>Satıcı bilgileri</h2>${sellerBlock(s)}`,
  },
  {
    slug: 'teslimat-ve-kargo',
    title: 'Teslimat ve kargo',
    description: 'Kargoya verilme süreleri, kargo ücreti ve teslim alma.',
    html: (s) => `<p>Stoktaki ürünler ödemen onaylandıktan sonra <strong>${e(s.shipDays)}</strong> içinde, kişiye özel nakış ve özel ölçü ürünleri <strong>${e(s.personalizedDays)}</strong> içinde kargoya verilir. Kargoya verildiğinde takip numarası e-posta adresine gönderilir ve sipariş sayfanda görünür.</p>
<p>Kargo ücreti ${s.shippingFee ? formatTL(s.shippingFee) : 'ücretsiz'}${s.freeShippingThreshold > 0 ? `; ${formatTL(s.freeShippingThreshold)} ve üzeri siparişlerde kargo ücretsiz` : ''}. Türkiye'nin her yerine gönderim yapıyoruz.</p>
<p>Paketi teslim alırken kontrol et. Hasarlı paketi kargo görevlisine tutanak tutturarak teslim alma ve bize haber ver, ürünü yeniden gönderelim.</p>`,
  },
  {
    slug: 'iade-ve-degisim',
    title: 'İade ve değişim',
    description: 'Cayma hakkı, iade ve değişim koşulları.',
    html: (s) => `<p>Ürünü teslim aldığın günden itibaren <strong>${s.returnDays} gün</strong> içinde gerekçe göstermeden iade edebilirsin. Ürün kullanılmamış, etiketi sökülmemiş ve tekrar satılabilir durumda olmalıdır.</p>
<h2>Nasıl iade ederim?</h2>
<ol><li>Sipariş sayfanı aç (e-postadaki bağlantıdan veya Hesabım &gt; Siparişlerim'den).</li><li>"İade talebi oluştur" bölümüne iade sebebini yaz ve gönder.</li><li>Sana göndereceğimiz kargo bilgisiyle ürünü 10 gün içinde geri gönder.</li><li>Ürün bize ulaşıp kontrol edildikten sonra ücret, ödeme yaptığın karta iade edilir. Bildiriminden itibaren en geç 14 gün içinde iade yapılır; tutarın hesabına geçmesi bankana göre birkaç gün sürebilir.</li></ol>
<h2>Beden değişimi</h2>
<p>Beden olmazsa iade talebinde "değişim" yaz. İlk beden değişiminin kargo ücretini biz karşılıyoruz.</p>
<h2>İade edilemeyen ürünler</h2>
<p>İsim, yazı veya arma işlenen, özel ölçüyle dikilen kişiye özel ürünler Mesafeli Sözleşmeler Yönetmeliği md. 15/1-ç gereği iade edilemez. Bu ürünlerde üretim hatası varsa ücretsiz düzeltir veya yenisini yaparız.</p>`,
  },
  {
    slug: 'mesafeli-satis-sozlesmesi',
    title: 'Mesafeli satış sözleşmesi',
    description: 'Siparişlerde geçerli sözleşme metni.',
    html: (s) =>
      distanceSalesHtml({ settings: s, buyer: null, items: [], subtotal: 0, discountTotal: 0, shippingTotal: 0, total: 0, date: new Date() }).replace(
        /<h2>Madde 3\. Ürünler ve bedel<\/h2>[\s\S]*?<h2>Madde 4/,
        '<h2>Madde 3. Ürünler ve bedel</h2><p>Ürünlerin adı, adedi, KDV dahil fiyatı, kargo bedeli ve ödeme şekli sipariş sırasında gösterilir ve sözleşmenin sipariş anındaki kopyası alıcıya e-posta ile gönderilir.</p><h2>Madde 4',
      ),
  },
  {
    slug: 'on-bilgilendirme-formu',
    title: 'Ön bilgilendirme formu',
    description: 'Sipariş öncesi bilgilendirme metni.',
    html: (s) =>
      preliminaryInfoHtml({ settings: s, buyer: null, items: [], subtotal: 0, discountTotal: 0, shippingTotal: 0, total: 0, date: new Date() }).replace(
        /<h2>3\. Ürünler, fiyatlar ve ödeme<\/h2>[\s\S]*?<h2>4/,
        '<h2>3. Ürünler, fiyatlar ve ödeme</h2><p>Siparişteki ürünler, KDV dahil fiyatları, kargo bedeli ve toplam tutar ödeme adımında gösterilir. Ödeme kredi kartı veya banka kartı ile iyzico güvenli ödeme altyapısı üzerinden yapılır.</p><h2>4',
      ),
  },
  {
    slug: 'kvkk',
    title: 'Kişisel verilerin korunması',
    description: 'KVKK aydınlatma metni.',
    html: (s) => `<p>Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) md. 10 uyarınca veri sorumlusu sıfatıyla ${sellerLine(s)} tarafından hazırlanmıştır.</p>
<h2>İşlenen veriler</h2>
<p>Kimlik (ad, soyad, isteğe bağlı T.C. kimlik no), iletişim (e-posta, telefon, adres), müşteri işlem (sipariş, iade ve talep kayıtları), işlem güvenliği (IP adresi, oturum kayıtları) ve pazarlama izni verdiysen pazarlama verileri. Kart bilgilerin bizim sistemimize ulaşmaz; ödeme doğrudan iyzico'nun güvenli sayfasında yapılır.</p>
<h2>İşleme amaçları ve hukuki sebepler</h2>
<p>Verilerin; siparişini almak, ödemeni doğrulamak, ürünü teslim etmek, fatura düzenlemek, iade ve şikâyetlerini yönetmek ve yasal yükümlülüklerimizi yerine getirmek amacıyla KVKK md. 5/2-c (sözleşmenin kurulması ve ifası), md. 5/2-ç (hukuki yükümlülük) ve md. 5/2-f (meşru menfaat) hukuki sebeplerine dayanarak işlenir. Pazarlama iletileri yalnızca açık rızan ile gönderilir.</p>
<h2>Aktarım</h2>
<p>Verilerin, siparişin teslimi için kargo firmasına, ödeme için iyzico Ödeme Hizmetleri A.Ş.'ye, fatura için mali müşavirimize ve e-fatura sağlayıcımıza, yasal talep halinde yetkili kamu kurumlarına aktarılır. Sitenin barındırma, veritabanı ve e-posta hizmet sağlayıcılarının sunucuları yurt dışında bulunabilir; bu aktarımlar KVKK md. 9 kapsamında standart sözleşmeler ile yapılır.</p>
<h2>Saklama süresi</h2>
<p>Sipariş ve fatura kayıtları ilgili mevzuatta öngörülen süreler (Vergi Usul Kanunu ve Türk Ticaret Kanunu gereği 10 yıl) boyunca saklanır, süre sonunda silinir veya anonim hale getirilir.</p>
<h2>Hakların</h2>
<p>KVKK md. 11 uyarınca verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, aktarıldığı kişileri öğrenme, itiraz etme ve zararının giderilmesini talep etme haklarına sahipsin. Başvurularını ${filled(s.contactEmail, 'E-posta')} adresine veya satıcı adresine yazılı olarak iletebilirsin. Başvurular en geç 30 gün içinde ücretsiz yanıtlanır.</p>`,
  },
  {
    slug: 'gizlilik-ve-cerezler',
    title: 'Gizlilik ve çerezler',
    description: 'Sitede kullanılan çerezler.',
    html: () => `<p>Bu sitede yalnızca sitenin çalışması için zorunlu çerezler kullanılır. Reklam veya analiz çerezi kullanılmaz.</p>
<table><thead><tr><th>Çerez</th><th>Amaç</th><th>Süre</th></tr></thead><tbody>
<tr><td>mc_sepet</td><td>Giriş yapmadan oluşturduğun sepeti hatırlamak</td><td>60 gün</td></tr>
<tr><td>mc_oturum</td><td>Hesabına giriş yaptığında oturumunu açık tutmak</td><td>30 gün</td></tr>
</tbody></table>
<p>Zorunlu çerezler KVKK md. 5/2-c kapsamında açık rıza gerektirmez. Tarayıcı ayarlarından çerezleri silebilirsin; bu durumda sepetin ve oturumun kapanır.</p>`,
  },
  {
    slug: 'uyelik-kosullari',
    title: 'Üyelik koşulları',
    description: 'Üye hesabı kullanım koşulları.',
    html: (s) => `<p>${e(s.storeName)} üyeliği ücretsizdir. Üye olarak siparişlerini takip edebilir, adreslerini kaydedebilir, favori ürünlerini saklayabilir ve satın aldığın ürünlere yorum yazabilirsin.</p>
<p>Hesap bilgilerinin doğruluğundan ve şifrenin gizliliğinden sen sorumlusun. Yorumlar yayınlanmadan önce incelenir; hakaret, kişisel bilgi veya reklam içeren yorumlar yayınlanmaz.</p>
<p>Hesabını silmek için ${filled(s.contactEmail, 'E-posta')} adresine yazabilirsin. Yasal saklama süresi olan sipariş kayıtları dışındaki verilerin silinir.</p>`,
  },
];

export function infoPage(slug: string): InfoPage | undefined {
  return INFO_PAGES.find((p) => p.slug === slug);
}
