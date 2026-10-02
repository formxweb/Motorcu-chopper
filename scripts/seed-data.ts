/* Başlangıç ürünleri. Fiyat ve stokları yönetim panelinden güncelleyin. Tutarlar kuruş cinsindendir. */

type SeedColor = { name: string; hex: string; key: string };
type SeedProduct = {
  slug: string;
  category: string;
  name: string;
  summary: string;
  description: string;
  details: string[];
  price: number;
  compareAtPrice?: number;
  badge?: string;
  colorLabel?: string;
  sizeLabel?: string;
  colors: SeedColor[];
  sizes: string[];
  stock: (color: string, size: string) => number;
  customFields?: { key: string; label: string; maxLength: number; required: boolean; placeholder: string }[];
  isPersonalized?: boolean;
  trackStock?: boolean;
  isFeatured?: boolean;
  sortOrder: number;
  images: { file: string; color: string; alt: string }[];
};

export const SEED_CATEGORIES = [
  { slug: 'deri-yelek', name: 'Deri yelek', description: 'Büyükbaş deriden kulüp yeleği, klasik ve bağcıklı motorcu yelekleri.', sortOrder: 1 },
  { slug: 'kot-yelek', name: 'Kot yelek', description: 'Arma dikmek için kalın kot yelekler.', sortOrder: 2 },
  { slug: 'arma-ve-nakis', name: 'Arma ve nakış', description: 'Kişiye özel rocker seti ve isim armaları.', sortOrder: 3 },
  { slug: 'aksesuar', name: 'Aksesuar', description: 'Cüzdan zinciri, deri bakım ve sürüş aksesuarları.', sortOrder: 4 },
];

const C = {
  siyah: { name: 'Siyah', hex: '#262428', key: 'siyah' },
  kahve: { name: 'Kahve', hex: '#4f3221', key: 'kahve' },
  taba: { name: 'Taba', hex: '#8f5d31', key: 'taba' },
  bordo: { name: 'Bordo', hex: '#541719', key: 'bordo' },
  koyuMavi: { name: 'Koyu mavi', hex: '#3f5c7d', key: 'koyu-mavi' },
  acikMavi: { name: 'Açık mavi', hex: '#6d8fb3', key: 'acik-mavi' },
  siyahKot: { name: 'Siyah', hex: '#2e2f34', key: 'siyah-kot' },
};
const COMBOS: SeedColor[] = [
  { name: 'Beyaz / siyah', hex: '#f1ede4', key: 'bs' },
  { name: 'Kırmızı / siyah', hex: '#d4362c', key: 'ks' },
  { name: 'Altın / siyah', hex: '#dcb24b', key: 'as' },
  { name: 'Beyaz / kırmızı', hex: '#a8221b', key: 'bk' },
];
const MEN = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const WOMEN = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
const sizeStock = (s: string) => ({ XS: 2, S: 3, M: 5, L: 6, XL: 6, '2XL': 4, '3XL': 2, '4XL': 1, 'Özel ölçü': 20 })[s] ?? 3;

function vestImages(slug: string, colors: SeedColor[], name: string) {
  return colors.flatMap((c) => [
    { file: `${slug}-${c.key}-on`, color: c.name, alt: `${name}, ${c.name.toLowerCase()}, önden` },
    { file: `${slug}-${c.key}-arka`, color: c.name, alt: `${name}, ${c.name.toLowerCase()}, arkadan` },
  ]);
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: 'kulup-yelegi',
    category: 'deri-yelek',
    name: 'Kulüp Yeleği',
    summary: 'Gömlek yaka, dikişsiz tek parça sırt',
    description:
      'Kulüp kesimi deri yelek: gömlek yaka ve dikişsiz tek parça sırt. Üst ve alt rocker ile orta armayı istersen biz dikeriz.\n\nKalın büyükbaş deri giydikçe vücuda oturur. İçteki fermuarlı gizli cep evrak ve telefon için.',
    details: ['1,4 mm kalın büyükbaş deri', 'Dikişsiz tek parça sırt', 'Fermuarlı gizli iç cep', 'Paslanmaz çelik çıtçıt'],
    price: 395000,
    badge: 'Arma dikimine hazır',
    colors: [C.siyah],
    sizes: [...MEN, 'Özel ölçü'],
    stock: (_c, s) => sizeStock(s),
    isFeatured: true,
    sortOrder: 1,
    images: vestImages('kulup-yelegi', [C.siyah], 'Kulüp yeleği'),
  },
  {
    slug: 'klasik-deri-yelek',
    category: 'deri-yelek',
    name: 'Klasik Deri Yelek',
    summary: 'Yakasız, dört çıtçıt',
    description: 'Yakasız, dört çıtçıtlı günlük sürüş yeleği. Sırtı tek parça olduğu için arma dikmeye de uygun.',
    details: ['1,2–1,4 mm büyükbaş deri', 'Pamuklu saten astar', '2 iç cep, 2 yan cep', 'Paslanmaz çelik çıtçıt'],
    price: 345000,
    colors: [C.siyah, C.kahve],
    sizes: [...MEN, 'Özel ölçü'],
    stock: (_c, s) => sizeStock(s),
    isFeatured: true,
    sortOrder: 2,
    images: vestImages('klasik-deri-yelek', [C.siyah, C.kahve], 'Klasik deri yelek'),
  },
  {
    slug: 'yan-bagcikli-deri-yelek',
    category: 'deri-yelek',
    name: 'Yan Bağcıklı Deri Yelek',
    summary: 'Yanları ayarlı, çıtçıtlı',
    description: 'Yanlardaki deri bağcıklar gevşetilip sıkılır. Kışın kalın kazak üstüne bol, yazın tişört üstüne dar ayarlarsın.',
    details: ['1,2–1,4 mm büyükbaş deri', 'İki yanda 7 sıra deri bağcık', '2 iç cep, 2 yan cep', 'Paslanmaz çelik çıtçıt'],
    price: 375000,
    colors: [C.siyah, C.kahve, C.bordo],
    sizes: [...MEN, 'Özel ölçü'],
    stock: (c, s) => (c === 'Bordo' ? Math.max(0, sizeStock(s) - 3) : sizeStock(s)),
    isFeatured: true,
    sortOrder: 3,
    images: vestImages('yan-bagcikli-deri-yelek', [C.siyah, C.kahve, C.bordo], 'Yan bağcıklı deri yelek'),
  },
  {
    slug: 'eskitme-taba-deri-yelek',
    category: 'deri-yelek',
    name: 'Eskitme Taba Deri Yelek',
    summary: 'Elde eskitilmiş taba deri',
    description: 'Taba deri elde eskitilir, bu yüzden her yelekte renk ve iz biraz farklı çıkar. Giydikçe koyulaşır.',
    details: ['1,4 mm bitkisel tabaklanmış deri', 'Elde eskitme', 'Pirinç çıtçıt', '2 iç cep'],
    price: 425000,
    colors: [C.taba],
    sizes: MEN,
    stock: (_c, s) => Math.max(0, sizeStock(s) - 2),
    isFeatured: true,
    sortOrder: 4,
    images: vestImages('eskitme-taba-deri-yelek', [C.taba], 'Eskitme taba deri yelek'),
  },
  {
    slug: 'fermuarli-deri-yelek',
    category: 'deri-yelek',
    name: 'Fermuarlı Deri Yelek',
    summary: 'Metal fermuar, yakalı',
    description: 'Önü metal fermuarlı, yakalı model. Rüzgârda açılmaz, kışın mont altına da girer.',
    details: ['1,2 mm büyükbaş deri', 'Metal fermuar', 'Kadife yaka içi', '2 yan cep, 1 iç cep'],
    price: 365000,
    colors: [C.kahve, C.siyah],
    sizes: MEN,
    stock: (_c, s) => sizeStock(s),
    sortOrder: 5,
    images: vestImages('fermuarli-deri-yelek', [C.kahve, C.siyah], 'Fermuarlı deri yelek'),
  },
  {
    slug: 'kadin-deri-yelek',
    category: 'deri-yelek',
    name: 'Kadın Deri Yelek',
    summary: 'Bele oturan kısa kesim',
    description: 'Bele oturan kısa kesim, önü fermuarlı, yanları bağcıklı. Motorda öne eğilince belden açılmaz.',
    details: ['1,2 mm yumuşak kuzu deri', 'Metal fermuar', 'İki yanda bağcık', '1 iç cep'],
    price: 345000,
    colors: [C.siyah, C.bordo],
    sizes: WOMEN,
    stock: (_c, s) => sizeStock(s),
    sortOrder: 6,
    images: vestImages('kadin-deri-yelek', [C.siyah, C.bordo], 'Kadın deri yelek'),
  },
  {
    slug: 'kot-yelek',
    category: 'kot-yelek',
    name: 'Kot Yelek',
    summary: '14 oz kalın kot, bakır düğme',
    description: '14 oz kalın kot, bakır düğme ve iki kapaklı göğüs cebi. Arma dikmek için en çok seçilen zemin.',
    details: ['14 oz %100 pamuk kot', 'Bakır düğme', '2 kapaklı göğüs cebi', 'Turuncu çift dikiş'],
    price: 165000,
    colors: [C.koyuMavi, C.siyahKot],
    sizes: MEN,
    stock: (_c, s) => sizeStock(s) + 2,
    isFeatured: true,
    sortOrder: 7,
    images: vestImages('kot-yelek', [C.koyuMavi, C.siyahKot], 'Kot yelek'),
  },
  {
    slug: 'acik-yikama-kot-yelek',
    category: 'kot-yelek',
    name: 'Açık Yıkama Kot Yelek',
    summary: 'Yakasız, hafif',
    description: 'Açık yıkama, yakasız kot yelek. Yazın tişört üstüne hafif gelir, sırtı arma için düz.',
    details: ['12 oz %100 pamuk kot', 'Bakır düğme', '2 kapaklı göğüs cebi', 'Yakasız kesim'],
    price: 155000,
    colors: [C.acikMavi],
    sizes: MEN,
    stock: (_c, s) => sizeStock(s),
    sortOrder: 8,
    images: vestImages('acik-yikama-kot-yelek', [C.acikMavi], 'Açık yıkama kot yelek'),
  },
  {
    slug: 'kisiye-ozel-rocker-seti',
    category: 'arma-ve-nakis',
    name: 'Kişiye Özel Rocker Seti',
    summary: 'Üst, alt rocker ve orta arma',
    description:
      'Üst ve alt rocker ile orta arma, nakış makinesinde işlenir. Bizden yelek alırsan dikim ücretsiz; yeleğini gönderirsen dikip geri yollarız.\n\nYazıyı aşağıdaki alanlara birebir yaz. Türkçe karakterler işlenebilir.',
    details: ['Rocker: 28 × 7 cm', 'Orta arma: 15 cm çap', 'Kenarı overlok', 'Yazı en fazla 18 karakter'],
    price: 145000,
    badge: 'Kişiye özel',
    colorLabel: 'Renk (yazı / zemin)',
    sizeLabel: 'Yazı tipi',
    colors: COMBOS,
    sizes: ['Gotik', 'Blok'],
    stock: () => 999,
    customFields: [
      { key: 'ust', label: 'Üst rocker yazısı', maxLength: 18, required: true, placeholder: 'Demir Atlar' },
      { key: 'alt', label: 'Alt rocker yazısı', maxLength: 18, required: false, placeholder: 'İzmir' },
    ],
    isPersonalized: true,
    trackStock: false,
    isFeatured: true,
    sortOrder: 9,
    images: COMBOS.flatMap((c) => [
      { file: `rocker-seti-${c.key}`, color: c.name, alt: `Rocker seti, ${c.name.toLowerCase()}, yelek sırtında` },
      { file: `rocker-seti-${c.key}-yakin`, color: c.name, alt: `Rocker seti, ${c.name.toLowerCase()}, yakından` },
    ]),
  },
  {
    slug: 'gogus-isim-armasi',
    category: 'arma-ve-nakis',
    name: 'Göğüs İsim Arması',
    summary: '10 × 4 cm, isim ya da lakap',
    description: 'Göğüse dikilen isim ya da lakap arması. Arkası ütüyle yapışır, üstüne dikiş atılır.',
    details: ['10 × 4 cm', 'Kenarı overlok', 'Arkası ütü yapışkanlı', 'Yazı en fazla 14 karakter'],
    price: 29000,
    badge: 'Kişiye özel',
    colorLabel: 'Renk (yazı / zemin)',
    sizeLabel: 'Yazı tipi',
    colors: COMBOS,
    sizes: ['Blok', 'Gotik'],
    stock: () => 999,
    customFields: [{ key: 'yazi', label: 'Arma yazısı', maxLength: 14, required: true, placeholder: 'Kaptan' }],
    isPersonalized: true,
    trackStock: false,
    sortOrder: 10,
    images: COMBOS.map((c) => ({ file: `isim-armasi-${c.key}`, color: c.name, alt: `İsim arması, ${c.name.toLowerCase()}` })),
  },
  {
    slug: 'cuzdan-zinciri',
    category: 'aksesuar',
    name: 'Cüzdan Zinciri',
    summary: '45 cm paslanmaz çelik',
    description: 'Kemer köprüsüne takılan kancalı uç ve cüzdana takılan halka. Paslanmaz çelik, kararmaz.',
    details: ['45 cm uzunluk', 'Paslanmaz çelik', 'Kancalı uç ve anahtar halkası'],
    price: 69000,
    colors: [],
    sizes: [],
    stock: () => 15,
    sortOrder: 11,
    images: [{ file: 'cuzdan-zinciri', color: '', alt: 'Paslanmaz çelik cüzdan zinciri' }],
  },
  {
    slug: 'deri-bakim-kremi',
    category: 'aksesuar',
    name: 'Deri Bakım Kremi',
    summary: 'Arı mumu ve lanolin, 150 ml',
    description: 'Yağmur ve güneşten sonra deriyi kurumaktan ve çatlamaktan korur. Ayda bir ince kat sür, 20 dakika sonra kuru bezle sil.',
    details: ['150 ml', 'Arı mumu ve lanolin', 'Siyah ve renkli deriye uygun'],
    price: 42000,
    colors: [],
    sizes: [],
    stock: () => 30,
    sortOrder: 12,
    images: [{ file: 'deri-bakim-kremi', color: '', alt: 'Deri bakım kremi kutusu' }],
  },
];
