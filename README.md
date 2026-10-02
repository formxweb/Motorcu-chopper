# Motorcu Chopper e-ticaret sitesi

Motorcu yeleği, kulüp yeleği ve kişiye özel arma satan mağazanın kendi sitesi. Next.js ile yazıldı. Veritabanı Supabase'de, kartla ödeme iyzico'da çalışır, site Vercel'de yayınlanır.

## Neler var

**Mağaza**
- Kategoriler, arama, renk ve bedene göre filtre, sıralama
- Ürün sayfası: renk/beden seçimi, seçeneğe göre stok ve fiyat, fotoğraf galerisi
- Kişiye özel ürünler: müşteri rocker veya isim yazısını kendisi yazar, sipariş ekranında aynen görünür
- Sepet, indirim kodu, ücretsiz kargo sınırı
- Ödeme: iyzico güvenli ödeme sayfası (3D Secure, taksit). Kart bilgisi sitemize hiç gelmez.
- Misafir veya üye olarak sipariş
- Sipariş sayfası: Alındı → Hazırlanıyor → Kargoda → Teslim edildi adımları, kargo takip numarası ve bağlantısı
- Üyelik: siparişlerim, kayıtlı adresler, favoriler, şifre yenileme
- Sipariş sonrası iptal ve iade talebi, satın alınan ürüne yorum
- Ön bilgilendirme formu, mesafeli satış sözleşmesi, KVKK, iade, teslimat, çerez sayfaları. Sözleşme her siparişte o anki hâliyle kaydedilir ve e-postayla gönderilir.

**Yönetim paneli** (`/yonetim`)
- Özet: günlük ve 30 günlük satış, kargolanacak siparişler, açık talepler, azalan stok, kurulum kontrol listesi
- Siparişler: durum değiştirme, kargo firması ve takip numarası girme, iptal, kısmi veya tam iade (iyzico üzerinden otomatik), not ekleme
- Ürünler: fotoğraf yükleme (telefon fotoğrafları otomatik küçültülür), renk ve beden, seçenek bazında stok ve fiyat, kişiselleştirme alanları
- Kategoriler, indirim kodları, müşteriler, yorum onayı, gönderilen e-postalar, ayarlar ve yöneticiler

**Otomatik e-postalar:** sipariş onayı (sözleşmeler ekte), kargoya verildi, teslim edildi, iptal, iade, şifre yenileme. Satıcıya yeni sipariş ve iptal/iade talebi bildirimi.

## Kurulum

Gerekenler: GitHub (bu depo), [Vercel](https://vercel.com) ve [Supabase](https://supabase.com) hesabı (ikisinin de ücretsiz planı yeterli), iyzico hesabı, bir e-posta hesabı (SMTP).

### 1. Supabase (veritabanı ve görseller)

1. supabase.com'da yeni proje aç. Bölge olarak **Frankfurt (eu-central-1)** seç, veritabanı şifresini bir yere not et.
2. **Connect** düğmesine bas:
   - "Transaction pooler" adresini kopyala (port **6543**) → `DATABASE_URL`
   - "Session pooler" adresini kopyala (port **5432**) → `DIRECT_DATABASE_URL`
   - Adreslerdeki `[YOUR-PASSWORD]` yerine veritabanı şifreni yaz.
3. **Project Settings → API Keys**: Project URL → `SUPABASE_URL`, **secret** anahtar (eski panelde `service_role`) → `SUPABASE_SECRET_KEY`.
   Görsellerin konduğu `urunler` kovası ilk kurulumda otomatik açılır.

### 2. iyzico test hesabı

1. https://sandbox-merchant.iyzipay.com/auth/register adresinden test hesabı aç (ücretsiz, belge istemez).
2. Panelde **Ayarlar → Firma Ayarları → API Anahtarları**: `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` (ikisi de `sandbox-` ile başlar).
3. Testte şu kartlarla ödeme yapılır: `5890040000000016`, `5526080000000006`. Son kullanma tarihi ileri bir tarih, CVC herhangi üç rakam, SMS şifresi `123456`.

### 3. Vercel (yayın)

1. vercel.com → **Add New → Project** → GitHub'daki `formxweb/Motorcu-chopper` deposunu seç.
2. **Environment Variables** bölümüne `.env.example` dosyasındaki değişkenleri gir:

| Değişken | Değer |
| --- | --- |
| `APP_URL` | Sitenin adresi, ör. `https://motorcuchopper.com` (alan adı yoksa Vercel'in verdiği `https://...vercel.app`) |
| `DATABASE_URL`, `DIRECT_DATABASE_URL` | 1. adımdaki adresler |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | 1. adımdaki değerler |
| `IYZICO_BASE_URL` | Testte `https://sandbox-api.iyzipay.com` |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` | 2. adımdaki anahtarlar |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | İlk yönetici hesabın (şifre en az 10 karakter) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | E-posta hesabının SMTP bilgileri |
| `CRON_SECRET` | Uzun rastgele bir metin |

3. **Deploy**'a bas. Derleme sırasında tablolar oluşur, örnek ürünler eklenir ve yönetici hesabın açılır.
4. Alan adın varsa **Settings → Domains** bölümünden ekle, sonra `APP_URL`'i güncelleyip yeniden yayınla (**Deployments → Redeploy**).

### 4. Mağazayı hazırla

1. `https://siteadresin/yonetim` adresinden `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile giriş yap.
2. **Ayarlar → Satıcı bilgileri**: unvan, adres, vergi dairesi ve numarası. Bunlar sözleşmelerde ve site altbilgisinde görünür, yasal olarak zorunludur.
3. **Ayarlar → Mağaza**: iletişim e-postası, telefon, yeni sipariş bildiriminin gideceği e-posta.
4. **Ürünler**: örnek ürünlerin fiyat ve stoklarını güncelle, çizim görselleri silip gerçek fotoğrafları yükle. İstemediğin ürünü sil veya "Satışta" kutusunu kapat.
5. **Özet** sayfasındaki kurulum listesinde eksik kalan adımları tamamla.
6. **Ayarlar → Mağaza → "Mağaza ziyaretçilere açık"** kutusunu işaretle. Kapalıyken ziyaretçiler "Yakında" sayfasını görür; sen yönetici olarak siteyi görebilirsin.

### 5. E-posta (SMTP)

Gmail kullanacaksan: Google hesabında iki adımlı doğrulamayı aç, **Uygulama şifreleri**nden yeni şifre al. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=adresin@gmail.com`, `SMTP_PASS=uygulama şifresi`. Günde yüzlerce sipariş beklemiyorsan yeterlidir. Kendi alan adından (siparis@alanadin.com) göndermek için Yandex 360, Zoho veya Brevo da kullanılabilir.

SMTP girilmezse e-postalar gönderilmez, yalnızca panelde **E-postalar** sayfasında görünür.

## Canlı ödemeye geçiş

1. **iyzico üye işyeri başvurusu** (iyzico.com → Başvur). Genelde istenenler: vergi levhası (şahıs şirketi yeterli), kimlik, şirket adına IBAN, imza sirküleri veya beyannamesi. Başvuruda site adresini verirsin; iyzico sitede şunlara bakar: ürünler ve fiyatlar, iletişim ve satıcı bilgileri, mesafeli satış sözleşmesi, iade koşulları, KVKK metni. Bunların hepsi hazır, sen yalnızca satıcı bilgilerini doldur.
2. Onay gelince canlı anahtarları al. Vercel'de `IYZICO_BASE_URL=https://api.iyzipay.com` yap, `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY`'i canlı anahtarlarla değiştir, yeniden yayınla.
3. iyzico panelinde **Ayarlar → Bildirimler** kısmına bildirim adresini gir: `https://siteadresin/api/odeme/iyzico/webhook`. Müşteri ödeme sonrasında sayfayı kapatsa bile sipariş bu sayede onaylanır.
4. Kendi kartınla küçük tutarlı bir sipariş verip panelden iade ederek dene.
5. **Ticaret Bakanlığı ETBİS kaydı**: internetten satış yapan herkes için zorunlu (etbis.ticaret.gov.tr, e-Devlet ile).
6. iyzico'nun verdiği "iyzico ile Öde" ve kart logolarını site altbilgisine eklemek istersen `src/components/shop/Footer.tsx` dosyasına konabilir.
7. Yasal metinler şablondur, yayına almadan önce bir avukata veya mali müşavire göz attırman önerilir.

## Günlük kullanım

**Yeni sipariş gelince** e-posta alırsın; sipariş panelde "İşlem bekleyen" sekmesinde görünür.
1. Siparişi aç. Kişiye özel ürünlerde müşterinin yazdığı metin sarı kutuda görünür, nakışa aynen ver.
2. "Hazırlanıyor olarak işaretle" (isteğe bağlı).
3. Kargoya verince firma ve takip numarasını gir, "Kargoya verildi olarak işaretle". Müşteriye takip bağlantılı e-posta gider.
4. Teslim edilince "Teslim edildi olarak işaretle".

**İptal:** kargoya verilmemiş siparişte "Siparişi iptal et ve ücreti iade et". Aynı gün içindeyse ödeme iptal edilir, karttan hiç çekilmez; sonraki günlerde karta iade yapılır.

**İade:** müşteri sipariş sayfasından iade talebi açar, sana e-posta gelir. Ürün eline ulaşınca siparişte "İadeyi onayla ve ücreti iade et". Tutarı değiştirerek kısmi iade de yapabilirsin. Kişiye özel ürünlerde site iade talebine izin vermez.

**Yarım kalan ödemeler:** müşteri ödeme sayfasında vazgeçerse ürünler 40 dakika ayrılı kalır, sonra stoğa döner. Bu kontrol her gün otomatik çalışır; Özet sayfasındaki "Yarım kalan ödemeleri kontrol et" ile elle de yapılır.

## Sınırlar

- Kargo firmasıyla otomatik entegrasyon yok: takip numarasını elle girersin. Anlaşmalı kargo firmanın API'si varsa sonradan eklenebilir.
- Fatura otomatik kesilmez; e-arşiv faturayı muhasebe programından kesersin. Müşterinin fatura bilgileri (bireysel/kurumsal, vergi no) siparişte görünür.
- Ödeme yalnızca kartla. Havale ve kapıda ödeme yok.

## Geliştirme

```bash
npm install
cp .env.example .env    # değerleri doldur
npm run db:setup        # tabloları ve örnek verileri kurar
npm run dev             # http://localhost:3000
```

- Veritabanı şemasını değiştirince: `npm run db:generate` (yeni göç dosyası `drizzle/` klasörüne yazılır, sonraki derlemede uygulanır).
- Uçtan uca testler GitHub Actions'ta her gönderimde çalışır (`.github/workflows/ci.yml`): sahte iyzico sunucusuyla sipariş, ödeme, kargo, iade, iptal, üyelik, indirim kodu ve ürün ekleme akışlarını dener.
- Örnek ürün görselleri `tools/ornek-gorseller` ile üretildi (`npm run gorseller`).
