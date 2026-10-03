# Motorcu Chopper e-ticaret sitesi

Motorcu yeleği, kulüp yeleği ve kişiye özel arma satan mağazanın kendi sitesi. Next.js ile yazıldı, Vercel'de yayınlanır. Kartla ödeme **Shopier** (şirket gerekmez, bireysel hesap yeter) veya **iyzico** (şirket gerekir) ile alınır.

## Neler var

**Mağaza**
- Kategoriler, arama, renk ve bedene göre filtre, sıralama
- Ürün sayfası: renk/beden seçimi, seçeneğe göre stok ve fiyat, fotoğraf galerisi
- Kişiye özel ürünler: müşteri rocker veya isim yazısını kendisi yazar, sipariş ekranında aynen görünür
- Sepet, indirim kodu, ücretsiz kargo sınırı
- Ödeme: Shopier veya iyzico güvenli ödeme sayfası (3D Secure, taksit). Kart bilgisi sitemize hiç gelmez.
- Misafir veya üye olarak sipariş
- Sipariş sayfası: Alındı → Hazırlanıyor → Kargoda → Teslim edildi adımları, kargo takip numarası ve bağlantısı
- Üyelik: siparişlerim, kayıtlı adresler, favoriler, şifre yenileme
- Sipariş sonrası iptal ve iade talebi, satın alınan ürüne yorum
- Ön bilgilendirme formu, mesafeli satış sözleşmesi, KVKK, iade, teslimat, çerez sayfaları. Sözleşme her siparişte o anki hâliyle kaydedilir ve e-postayla gönderilir.

**Yönetim paneli** (`/yonetim`)
- Özet: günlük ve 30 günlük satış, kargolanacak siparişler, açık talepler, azalan stok, kurulum kontrol listesi
- Siparişler: durum değiştirme, kargo firması ve takip numarası girme, iptal, kısmi veya tam iade (iyzico'da otomatik, Shopier'de panelden), ödemesi siteye düşmeyen siparişi elle onaylama, not ekleme
- Ürünler: fotoğraf yükleme (telefon fotoğrafları otomatik küçültülür), renk ve beden, seçenek bazında stok ve fiyat, kişiselleştirme alanları
- Kategoriler, indirim kodları, müşteriler, yorum onayı, gönderilen e-postalar, ayarlar ve yöneticiler

**Otomatik e-postalar:** sipariş onayı (sözleşmeler ekte), kargoya verildi, teslim edildi, iptal, iade, şifre yenileme. Satıcıya yeni sipariş ve iptal/iade talebi bildirimi.

## Tek tıkla kurulum

[![Vercel ile kur](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fformxweb%2FMotorcu-chopper&project-name=motorcu-chopper-magaza&repository-name=motorcu-chopper-magaza&env=ADMIN_EMAIL,ADMIN_PASSWORD&envDescription=Y%C3%B6netim%20paneline%20girece%C4%9Fin%20e-posta%20ve%20%C5%9Fifre%20%28%C5%9Fifre%20en%20az%208%20karakter%29.&envLink=https%3A%2F%2Fgithub.com%2Fformxweb%2FMotorcu-chopper%23tek-t%C4%B1kla-kurulum&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D)

1. Düğmeye bas, GitHub hesabınla Vercel'e gir.
2. **Create** → depo senin GitHub hesabına kopyalanır.
3. **Neon (Postgres)** veritabanı kutusunda **Add** / **Continue** de (ücretsiz plan, bölge olarak Frankfurt seç).
4. `ADMIN_EMAIL` ve `ADMIN_PASSWORD` kutularına yönetim paneli için e-posta ve şifreni yaz (şifre en az 8 karakter), **Deploy**'a bas.

2-3 dakika sonra site `https://motorcu-chopper-magaza.vercel.app` gibi bir adreste açılır: 12 örnek ürün, kategoriler ve yönetim paneli (`/yonetim`) hazırdır. Ürün fotoğrafları veritabanında saklanır, ayrıca depolama gerekmez. Kurulumun durumunu `/durum` adresinden görebilirsin.

Kartla ödemeyi açmak için `/yonetim` → **Ayarlar → Shopier ile kartla ödeme** bölümüne Shopier API bilgilerini gir (aşağıda "Shopier ile ödeme"). Ödeme bağlanana kadar site katalog olarak çalışır, sepette "Online ödeme henüz aktif değil" yazar.

## Shopier ile ödeme (şirket gerekmez)

1. [shopier.com](https://www.shopier.com)'da satıcı hesabı aç. Bireysel hesap için T.C. kimlik, kimlik fotoğrafı ve IBAN yeterli. Hesabın onaylanmasını bekle.
2. Shopier panelinde **Entegrasyonlar → Modül Yönetimi → Modül Ayarları** sayfasını aç.
3. **Kayıtlı Alan Adları** kısmına sitenin adresini (ör. `https://motorcu-chopper-magaza.vercel.app`), **Geri Dönüş URL** kısmına `https://siteadresin/api/odeme/shopier/geri-donus` adresini ekle. Bu adres sitenin yönetim panelinde **Ayarlar** sayfasında da yazar.
4. Aynı sayfadaki **API kullanıcı** ve **API şifre**yi kopyala, sitede `/yonetim` → **Ayarlar → Shopier ile kartla ödeme** bölümüne yapıştırıp **Kaydet**. Geri dönüş adresini Shopier'de 1. satıra eklemediysen "sırası" kutusundan doğru satırı seç.
5. Shopier'de deneme modu yok: kendi kartınla küçük bir sipariş verip ödeme sonrası siteye döndüğünü ve siparişin "Ödendi" olduğunu kontrol et, sonra panelden iptal edip Shopier'den iade et.

Notlar:
- Shopier bağlıyken ödemeler Shopier ile alınır; bağlantıyı Ayarlar'dan kaldırırsan iyzico anahtarları varsa iyzico'ya döner.
- Shopier'in iade için bağlantısı yok. Sitede iptal/iade yaptığında tutar kaydedilir ve müşteriye bildirilir; parayı Shopier panelinden iade edersin.
- Müşteri ödedikten sonra tarayıcıyı Shopier sayfasında kapatırsa sipariş "ödeme bekleniyor" kalabilir (40 dakika sonra "ödeme alınamadı" olur). Ödeme Shopier panelinde görünüyorsa siparişi açıp **"Ödeme Shopier panelinde görünüyorsa elle onayla"** ile onayla.
- Anahtarları panel yerine Vercel ortam değişkeni olarak da girebilirsin: `SHOPIER_API_KEY`, `SHOPIER_API_SECRET`, `SHOPIER_WEBSITE_INDEX`.
- Şirketsiz düzenli satışta vergi yükümlülüğü doğar; bir mali müşavire danış.

## Elle kurulum

Gerekenler: GitHub (bu depo), [Vercel](https://vercel.com) ve [Supabase](https://supabase.com) hesabı (ikisinin de ücretsiz planı yeterli), iyzico hesabı, bir e-posta hesabı (SMTP).

### 1. Supabase (veritabanı ve görseller)

1. supabase.com'da yeni proje aç. Bölge olarak **Frankfurt (eu-central-1)** seç, veritabanı şifresini bir yere not et.
2. **Connect** düğmesine bas:
   - "Transaction pooler" adresini kopyala (port **6543**) → `DATABASE_URL`
   - "Session pooler" adresini kopyala (port **5432**) → `DIRECT_DATABASE_URL`
   - Adreslerdeki `[YOUR-PASSWORD]` yerine veritabanı şifreni yaz.
3. (İsteğe bağlı) **Project Settings → API Keys**: Project URL → `SUPABASE_URL`, **secret** anahtar (eski panelde `service_role`) → `SUPABASE_SECRET_KEY`.
   Girersen ürün fotoğrafları Supabase Storage'a yüklenir (`urunler` kovası ilk kurulumda otomatik açılır); girmezsen veritabanında saklanır.

### 2. iyzico test hesabı (yalnızca şirketin varsa; Shopier kullanacaksan atla)

1. https://sandbox-merchant.iyzipay.com/auth/register adresinden test hesabı aç (ücretsiz, belge istemez).
2. Panelde **Ayarlar → Firma Ayarları → API Anahtarları**: `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` (ikisi de `sandbox-` ile başlar).
3. Testte şu kartlarla ödeme yapılır: `5890040000000016`, `5526080000000006`. Son kullanma tarihi ileri bir tarih, CVC herhangi üç rakam, SMS şifresi `123456`.

### 3. Vercel (yayın)

1. vercel.com → **Add New → Project** → GitHub'daki `formxweb/Motorcu-chopper` deposunu seç.
2. **Environment Variables** bölümüne `.env.example` dosyasındaki değişkenleri gir:

| Değişken | Değer |
| --- | --- |
| `APP_URL` | Sitenin adresi, ör. `https://motorcuchopper.com` (alan adı yoksa Vercel'in verdiği `https://...vercel.app`) |
| `DATABASE_URL`, `DIRECT_DATABASE_URL` | 1. adımdaki adresler (Vercel'in Neon eklentisinin verdiği `DATABASE_URL` / `DATABASE_URL_UNPOOLED` da olur) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | 1. adımdaki değerler |
| `IYZICO_BASE_URL` | Testte `https://sandbox-api.iyzipay.com` |
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` | 2. adımdaki anahtarlar (Shopier kullanacaksan boş bırak) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | İlk yönetici hesabın (şifre en az 8 karakter) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | E-posta hesabının SMTP bilgileri |
| `CRON_SECRET` | (İsteğe bağlı) uzun rastgele bir metin; günlük temizlik görevi için |

3. **Deploy**'a bas. Derleme sırasında tablolar oluşur, örnek ürünler eklenir ve yönetici hesabın açılır.
4. Alan adın varsa **Settings → Domains** bölümünden ekle, sonra `APP_URL`'i güncelleyip yeniden yayınla (**Deployments → Redeploy**).

### 4. Mağazayı hazırla

1. `https://siteadresin/yonetim` adresinden `ADMIN_EMAIL` ve `ADMIN_PASSWORD` ile giriş yap.
2. **Ayarlar → Satıcı bilgileri**: unvan, adres, vergi dairesi ve numarası. Bunlar sözleşmelerde ve site altbilgisinde görünür, yasal olarak zorunludur.
3. **Ayarlar → Mağaza**: iletişim e-postası, telefon, yeni sipariş bildiriminin gideceği e-posta.
4. **Ürünler**: örnek ürünlerin fiyat ve stoklarını güncelle, çizim görselleri silip gerçek fotoğrafları yükle. İstemediğin ürünü sil veya "Satışta" kutusunu kapat.
5. **Özet** sayfasındaki kurulum listesinde eksik kalan adımları tamamla.
6. Mağaza ilk kurulumda ziyaretçilere açık başlar. Hazırlık bitene kadar kapatmak istersen **Ayarlar → Mağaza → "Mağaza ziyaretçilere açık"** kutusunu kaldır; kapalıyken ziyaretçiler "Yakında" sayfasını görür, sen yönetici olarak siteyi görebilirsin.

### 5. E-posta (SMTP)

Gmail kullanacaksan: Google hesabında iki adımlı doğrulamayı aç, **Uygulama şifreleri**nden yeni şifre al. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=adresin@gmail.com`, `SMTP_PASS=uygulama şifresi`. Günde yüzlerce sipariş beklemiyorsan yeterlidir. Kendi alan adından (siparis@alanadin.com) göndermek için Yandex 360, Zoho veya Brevo da kullanılabilir.

SMTP girilmezse e-postalar gönderilmez, yalnızca panelde **E-postalar** sayfasında görünür.

## iyzico ile canlı ödemeye geçiş (şirket gerekir)

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
- Ödeme yalnızca kartla (Shopier veya iyzico). Havale ve kapıda ödeme yok.

## Geliştirme

```bash
npm install
cp .env.example .env    # değerleri doldur
npm run db:setup        # tabloları ve örnek verileri kurar
npm run dev             # http://localhost:3000
```

- Veritabanı şemasını değiştirince: `npm run db:generate` (yeni göç dosyası `drizzle/` klasörüne yazılır, sonraki derlemede uygulanır).
- Uçtan uca testler GitHub Actions'ta her gönderimde çalışır (`.github/workflows/ci.yml`): sahte iyzico ve sahte Shopier sunucularıyla sipariş, ödeme, imza kontrolü, kargo, iade, iptal, üyelik, indirim kodu ve ürün ekleme akışlarını dener. Test çıktıları ve ekran görüntüleri `ci-results` dalına yazılır.
- GitHub'da **Settings → Secrets and variables → Actions** bölümüne `IYZICO_SANDBOX_API_KEY` ve `IYZICO_SANDBOX_SECRET_KEY` eklersen her testte iyzico'nun gerçek test sunucusuna da istek atılır ve kimlik doğrulaması kontrol edilir.
- Örnek ürün görselleri `tools/ornek-gorseller` ile üretildi (`npm run gorseller`).
