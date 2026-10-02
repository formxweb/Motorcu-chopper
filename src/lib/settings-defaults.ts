/* Saf modül: tarayıcıda, sunucuda ve kurulum betiğinde kullanılabilir. */

export type Carrier = { id: string; name: string; url: string };

export type StoreSettings = {
  storeName: string;
  tagline: string;
  announcement: string;
  storeOpen: boolean;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  instagram: string;
  workingHours: string;
  notifyEmail: string;
  seller: {
    title: string;
    address: string;
    taxOffice: string;
    taxNumber: string;
    mersis: string;
    kep: string;
  };
  shippingFee: number;
  freeShippingThreshold: number;
  shipDays: string;
  personalizedDays: string;
  returnDays: number;
  carriers: Carrier[];
};

export const DEFAULT_CARRIERS: Carrier[] = [
  { id: 'yurtici', name: 'Yurtiçi Kargo', url: 'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={kod}' },
  { id: 'aras', name: 'Aras Kargo', url: 'https://kargotakip.araskargo.com.tr/mainpage.aspx?code={kod}' },
  { id: 'mng', name: 'DHL eCommerce (MNG)', url: 'https://www.dhlecommerce.com.tr/gonderitakip?trackingNumber={kod}' },
  { id: 'ptt', name: 'PTT Kargo', url: 'https://gonderitakip.ptt.gov.tr/Track/Verify?q={kod}' },
  { id: 'surat', name: 'Sürat Kargo', url: 'https://suratkargo.com.tr/KargoTakip/?kargotakipno={kod}' },
  { id: 'hepsijet', name: 'HepsiJet', url: 'https://www.hepsijet.com/gonderi-takibi/{kod}' },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Motorcu Chopper',
  tagline: 'Yelek & Ekipman',
  announcement: '2.500 TL ve üzeri siparişlerde kargo ücretsiz',
  storeOpen: false,
  contactEmail: '',
  contactPhone: '+90 505 275 17 22',
  whatsapp: '905052751722',
  instagram: 'https://www.instagram.com/motorcu_chopper_yelek_ekipman/',
  workingHours: 'Hafta içi 09:00–18:00',
  notifyEmail: '',
  seller: { title: '', address: '', taxOffice: '', taxNumber: '', mersis: '', kep: '' },
  shippingFee: 15000,
  freeShippingThreshold: 250000,
  shipDays: '1–3 iş günü',
  personalizedDays: '7–10 iş günü',
  returnDays: 14,
  carriers: DEFAULT_CARRIERS,
};

export function mergeSettings(raw: Record<string, unknown> | null | undefined): StoreSettings {
  const r = (raw ?? {}) as Partial<StoreSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    seller: { ...DEFAULT_SETTINGS.seller, ...(r.seller ?? {}) },
    carriers: Array.isArray(r.carriers) && r.carriers.length ? r.carriers : DEFAULT_SETTINGS.carriers,
  };
}

export function trackingLink(carriers: Carrier[], carrierId: string, code: string): string {
  const c = carriers.find((x) => x.id === carrierId);
  if (!c || !c.url) return '';
  return c.url.replace('{kod}', encodeURIComponent(code.trim()));
}
