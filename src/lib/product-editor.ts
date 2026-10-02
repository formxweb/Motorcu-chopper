/* Ürün editörü ile sunucu arasında taşınan veri. Tarayıcıda da kullanılır. */

export type EditorImage = { id?: string; url: string; thumbUrl: string; alt: string; color: string };

export type EditorVariant = {
  color: string;
  size: string;
  sku: string;
  stock: number;
  price: string;
  isActive: boolean;
};

export type EditorField = { key: string; label: string; maxLength: number; required: boolean; placeholder: string };

export type EditorPayload = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  summary: string;
  description: string;
  details: string;
  price: string;
  compareAtPrice: string;
  badge: string;
  colorLabel: string;
  sizeLabel: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  customFields: EditorField[];
  isPersonalized: boolean;
  trackStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  images: EditorImage[];
  variants: EditorVariant[];
};

export function comboKey(color: string, size: string): string {
  return `${color}\u0000${size}`;
}

/** Renk ve beden listesinden olması gereken tüm kombinasyonları üretir, var olan değerleri korur. */
export function syncVariants(colors: string[], sizes: string[], current: EditorVariant[]): EditorVariant[] {
  const cs = colors.length ? colors : [''];
  const ss = sizes.length ? sizes : [''];
  const map = new Map(current.map((v) => [comboKey(v.color, v.size), v]));
  const out: EditorVariant[] = [];
  for (const c of cs) {
    for (const s of ss) {
      out.push(map.get(comboKey(c, s)) ?? { color: c, size: s, sku: '', stock: 0, price: '', isActive: true });
    }
  }
  return out;
}
