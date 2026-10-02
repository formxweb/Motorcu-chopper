'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { deleteProduct, saveProduct } from '@/app/actions/admin-catalog';
import { syncVariants, type EditorImage, type EditorPayload, type EditorVariant } from '@/lib/product-editor';
import { FormMessage, useFormAction } from '../forms';

type Cat = { id: string; name: string };

const SIZE_PRESETS: Record<string, string[]> = {
  'Erkek S–4XL': ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
  'Kadın XS–2XL': ['XS', 'S', 'M', 'L', 'XL', '2XL'],
};

async function encode(file: File, max: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tarayıcı görseli işleyemedi.');
  ctx.drawImage(bmp, 0, 0, w, h);
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  let blob = await toBlob('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg');
  if (!blob) throw new Error('Görsel dönüştürülemedi.');
  return blob;
}

async function uploadFile(file: File): Promise<{ url: string; thumbUrl: string }> {
  const [main, thumb] = await Promise.all([encode(file, 1600, 0.85), encode(file, 640, 0.8)]);
  const ext = main.type === 'image/webp' ? 'webp' : 'jpg';
  const fd = new FormData();
  fd.set('main', new File([main], `gorsel.${ext}`, { type: main.type }));
  fd.set('thumb', new File([thumb], `kucuk.${ext}`, { type: thumb.type }));
  const res = await fetch('/api/yonetim/gorsel', { method: 'POST', body: fd });
  const json = (await res.json().catch(() => ({}))) as { url?: string; thumbUrl?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error || 'Yükleme başarısız.');
  return { url: json.url, thumbUrl: json.thumbUrl || json.url };
}

export function ProductEditor({ initial, categories }: { initial: EditorPayload; categories: Cat[] }) {
  const router = useRouter();
  const [p, setP] = useState<EditorPayload>(initial);
  const [sizesText, setSizesText] = useState(initial.sizes.join(', '));
  const [uploading, setUploading] = useState(0);
  const [uploadErr, setUploadErr] = useState('');
  const [over, setOver] = useState(false);
  const [bulkStock, setBulkStock] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { state, pending, onSubmit } = useFormAction(saveProduct);
  const del = useFormAction(deleteProduct);

  useEffect(() => {
    if (!state.ok || !state.fields?.id) return;
    if (!p.id) {
      router.replace(`/yonetim/urunler/${state.fields.id}?kaydedildi=1`);
      return;
    }
    try {
      const imgs = JSON.parse(state.fields.images ?? '[]') as EditorImage[];
      setP((cur) => ({ ...cur, slug: state.fields?.slug ?? cur.slug, images: imgs }));
    } catch {
      /* görsel listesi okunamazsa sayfa yenilenince düzelir */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const set = <K extends keyof EditorPayload>(k: K, v: EditorPayload[K]) => setP((cur) => ({ ...cur, [k]: v }));
  const withVariants = (next: EditorPayload): EditorPayload => ({
    ...next,
    variants: syncVariants(
      next.colors.map((c) => c.name.trim()).filter(Boolean),
      next.sizes,
      next.variants,
    ),
  });

  const setColors = (colors: EditorPayload['colors']) => setP((cur) => withVariants({ ...cur, colors }));
  const applySizes = (text: string) => {
    const sizes = [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))];
    setSizesText(sizes.join(', '));
    setP((cur) => withVariants({ ...cur, sizes }));
  };
  const setVariant = (i: number, patch: Partial<EditorVariant>) =>
    setP((cur) => ({ ...cur, variants: cur.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }));
  const setImage = (i: number, patch: Partial<EditorImage>) => setP((cur) => ({ ...cur, images: cur.images.map((m, k) => (k === i ? { ...m, ...patch } : m)) }));
  const moveImage = (i: number, d: number) =>
    setP((cur) => {
      const arr = [...cur.images];
      const j = i + d;
      if (j < 0 || j >= arr.length) return cur;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...cur, images: arr };
    });

  const addFiles = async (files: FileList | File[]) => {
    setUploadErr('');
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    for (const f of list) {
      setUploading((n) => n + 1);
      try {
        const r = await uploadFile(f);
        setP((cur) => ({ ...cur, images: [...cur.images, { url: r.url, thumbUrl: r.thumbUrl, alt: '', color: '' }] }));
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : 'Yükleme başarısız.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const colorNames = p.colors.map((c) => c.name.trim()).filter(Boolean);
  const totalStock = p.variants.reduce((s, v) => s + (v.isActive ? v.stock : 0), 0);

  return (
    <>
      <form onSubmit={onSubmit} noValidate data-testid="urun-editoru">
        <input type="hidden" name="data" value={JSON.stringify(p)} />
        <div className="pe">
          <div className="pe-main">
            <section className="panel">
              <h2>Temel bilgiler</h2>
              <label className="field" htmlFor="pe-name">
                <span>Ürün adı</span>
                <input id="pe-name" value={p.name} onChange={(e) => set('name', e.target.value)} />
              </label>
              <div className="grid-2">
                <label className="field" htmlFor="pe-cat">
                  <span>Kategori</span>
                  <select id="pe-cat" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                    <option value="">Kategorisiz</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" htmlFor="pe-slug">
                  <span>Sayfa adresi (boş bırakılırsa addan oluşur)</span>
                  <input id="pe-slug" value={p.slug} onChange={(e) => set('slug', e.target.value)} placeholder="klasik-deri-yelek" />
                </label>
              </div>
              <label className="field" htmlFor="pe-summary">
                <span>Kısa açıklama (kartlarda görünür)</span>
                <input id="pe-summary" value={p.summary} maxLength={200} onChange={(e) => set('summary', e.target.value)} />
              </label>
              <label className="field" htmlFor="pe-desc">
                <span>Açıklama (paragrafları boş satırla ayır)</span>
                <textarea id="pe-desc" rows={6} value={p.description} onChange={(e) => set('description', e.target.value)} />
              </label>
              <label className="field" htmlFor="pe-details">
                <span>Özellikler (her satıra bir madde)</span>
                <textarea id="pe-details" rows={4} value={p.details} onChange={(e) => set('details', e.target.value)} placeholder={'1,4 mm büyükbaş deri\nPaslanmaz çelik çıtçıt'} />
              </label>
            </section>

            <section className="panel">
              <h2>Fiyat</h2>
              <div className="grid-2">
                <label className="field" htmlFor="pe-price">
                  <span>Satış fiyatı (TL, KDV dahil)</span>
                  <input id="pe-price" inputMode="decimal" value={p.price} onChange={(e) => set('price', e.target.value)} placeholder="3450" />
                </label>
                <label className="field" htmlFor="pe-compare">
                  <span>İndirim öncesi fiyat (isteğe bağlı)</span>
                  <input id="pe-compare" inputMode="decimal" value={p.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} />
                </label>
              </div>
              <p className="hint">İndirim öncesi fiyat, son 30 gün içinde uyguladığın en düşük fiyat olmalı (Fiyat Etiketi Yönetmeliği).</p>
            </section>

            <section className="panel">
              <h2>Görseller</h2>
              <div
                className={over ? 'drop over' : 'drop'}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  void addFiles(e.dataTransfer.files);
                }}
              >
                <p>Fotoğrafları buraya sürükle veya seç. Telefon fotoğrafları otomatik küçültülür.</p>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} data-testid="gorsel-sec" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                  Fotoğraf seç
                </button>
                {uploading > 0 ? <p>{uploading} görsel yükleniyor…</p> : null}
                {uploadErr ? <p className="stock stock-bad">{uploadErr}</p> : null}
              </div>
              {p.images.length ? (
                <div className="img-grid">
                  {p.images.map((m, i) => (
                    <div className="img-item" key={m.id ?? m.url}>
                      <img src={m.thumbUrl || m.url} alt="" width={200} height={250} />
                      <div className="img-ctl">
                        {colorNames.length ? (
                          <select value={m.color} onChange={(e) => setImage(i, { color: e.target.value })} aria-label="Görselin rengi">
                            <option value="">Tüm renkler</option>
                            {colorNames.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <input value={m.alt} onChange={(e) => setImage(i, { alt: e.target.value })} placeholder="Görsel açıklaması" aria-label="Görsel açıklaması" />
                        <div className="img-btns">
                          <button type="button" onClick={() => moveImage(i, -1)} aria-label="Sola taşı" disabled={i === 0}>
                            ←
                          </button>
                          <button type="button" onClick={() => moveImage(i, 1)} aria-label="Sağa taşı" disabled={i === p.images.length - 1}>
                            →
                          </button>
                          <button type="button" onClick={() => set('images', p.images.filter((_, k) => k !== i))} aria-label="Görseli kaldır">
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Henüz görsel yok. İlk görsel kapak olarak kullanılır.</p>
              )}
            </section>

            <section className="panel">
              <h2>Seçenekler</h2>
              <div className="grid-2">
                <label className="field" htmlFor="pe-clabel">
                  <span>1. seçenek adı</span>
                  <input id="pe-clabel" value={p.colorLabel} onChange={(e) => set('colorLabel', e.target.value)} placeholder="Renk" />
                </label>
                <label className="field" htmlFor="pe-slabel">
                  <span>2. seçenek adı</span>
                  <input id="pe-slabel" value={p.sizeLabel} onChange={(e) => set('sizeLabel', e.target.value)} placeholder="Beden" />
                </label>
              </div>
              <div className="rows">
                <strong>{p.colorLabel || 'Renk'} değerleri</strong>
                {p.colors.map((c, i) => (
                  <div className="row" key={i}>
                    <input
                      type="color"
                      value={c.hex}
                      onChange={(e) => setColors(p.colors.map((x, k) => (k === i ? { ...x, hex: e.target.value } : x)))}
                      aria-label="Renk kodu"
                    />
                    <input
                      value={c.name}
                      onChange={(e) => setColors(p.colors.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))}
                      placeholder="Siyah"
                      aria-label="Renk adı"
                    />
                    <button type="button" className="x-btn" onClick={() => setColors(p.colors.filter((_, k) => k !== i))} aria-label="Rengi kaldır">
                      ×
                    </button>
                  </div>
                ))}
                <div className="row">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColors([...p.colors, { name: '', hex: '#262428' }])}>
                    Renk ekle
                  </button>
                </div>
              </div>
              <label className="field" htmlFor="pe-sizes">
                <span>{p.sizeLabel || 'Beden'} değerleri (virgülle ayır)</span>
                <input id="pe-sizes" value={sizesText} onChange={(e) => setSizesText(e.target.value)} onBlur={(e) => applySizes(e.target.value)} placeholder="S, M, L, XL" />
              </label>
              <div className="row">
                {Object.entries(SIZE_PRESETS).map(([k, v]) => (
                  <button type="button" key={k} className="btn btn-ghost btn-sm" onClick={() => applySizes(v.join(', '))}>
                    {k}
                  </button>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => applySizes('')}>
                  Beden yok
                </button>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Stok ve seçenek fiyatları</h2>
                <label className="check">
                  <input type="checkbox" checked={p.trackStock} onChange={(e) => set('trackStock', e.target.checked)} />
                  <span>Stok takibi yap</span>
                </label>
              </div>
              {p.trackStock ? (
                <div className="row">
                  <input className="narrow-in" inputMode="numeric" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} placeholder="Adet" aria-label="Toplu stok" />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const n = Number.parseInt(bulkStock, 10);
                      if (Number.isFinite(n)) set('variants', p.variants.map((v) => ({ ...v, stock: n })));
                    }}
                  >
                    Tümüne uygula
                  </button>
                  <span className="hint">Toplam stok: {totalStock}</span>
                </div>
              ) : (
                <p className="hint">Stok takibi kapalı: siparişe özel üretilen ürünlerde (nakış, özel ölçü) kullan. Ürün her zaman satılabilir görünür.</p>
              )}
              <div className="tbl-wrap">
                <table className="tbl vt">
                  <thead>
                    <tr>
                      <th>Seçenek</th>
                      {p.trackStock ? <th>Stok</th> : null}
                      <th>Farklı fiyat (TL)</th>
                      <th>Stok kodu</th>
                      <th>Satışta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.variants.map((v, i) => (
                      <tr key={`${v.color}|${v.size}`}>
                        <td>{[v.color, v.size].filter(Boolean).join(' / ') || 'Tek seçenek'}</td>
                        {p.trackStock ? (
                          <td>
                            <input
                              className="stock-in"
                              inputMode="numeric"
                              value={String(v.stock)}
                              onChange={(e) => setVariant(i, { stock: Number.parseInt(e.target.value.replace(/[^\d-]/g, ''), 10) || 0 })}
                              aria-label="Stok"
                            />
                          </td>
                        ) : null}
                        <td>
                          <input className="price-in" inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="Aynı" aria-label="Seçenek fiyatı" />
                        </td>
                        <td>
                          <input className="sku-in" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} aria-label="Stok kodu" />
                        </td>
                        <td>
                          <input type="checkbox" checked={v.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} aria-label="Satışta" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <h2>Kişiselleştirme</h2>
              <p className="hint">Müşteriden yazı istenen ürünler için (rocker yazısı, isim arması). Alan eklenen ürün kişiye özel sayılır ve cayma hakkı dışında kalır.</p>
              <div className="rows">
                {p.customFields.map((f, i) => (
                  <div className="row" key={i}>
                    <input
                      value={f.label}
                      onChange={(e) => set('customFields', p.customFields.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                      placeholder="Üst rocker yazısı"
                      aria-label="Alan adı"
                    />
                    <input
                      className="narrow-in"
                      inputMode="numeric"
                      value={String(f.maxLength)}
                      onChange={(e) => set('customFields', p.customFields.map((x, k) => (k === i ? { ...x, maxLength: Number.parseInt(e.target.value, 10) || 1 } : x)))}
                      aria-label="En fazla karakter"
                      title="En fazla karakter"
                    />
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => set('customFields', p.customFields.map((x, k) => (k === i ? { ...x, required: e.target.checked } : x)))}
                      />
                      <span>Zorunlu</span>
                    </label>
                    <button type="button" className="x-btn" onClick={() => set('customFields', p.customFields.filter((_, k) => k !== i))} aria-label="Alanı kaldır">
                      ×
                    </button>
                  </div>
                ))}
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => set('customFields', [...p.customFields, { key: '', label: '', maxLength: 18, required: true, placeholder: '' }])}
                  >
                    Yazı alanı ekle
                  </button>
                </div>
              </div>
              <label className="check">
                <input type="checkbox" checked={p.isPersonalized || p.customFields.length > 0} onChange={(e) => set('isPersonalized', e.target.checked)} disabled={p.customFields.length > 0} />
                <span>Kişiye özel ürün (cayma hakkı yok, kargo süresi kişiye özel süre olarak gösterilir)</span>
              </label>
            </section>
          </div>

          <div className="pe-side">
            <section className="panel">
              <h2>Yayın</h2>
              <div className="toggles">
                <label className="check">
                  <input type="checkbox" checked={p.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                  <span>Satışta (mağazada görünür)</span>
                </label>
                <label className="check">
                  <input type="checkbox" checked={p.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
                  <span>Ana sayfada öne çıkar</span>
                </label>
              </div>
              <label className="field" htmlFor="pe-badge">
                <span>Etiket (isteğe bağlı)</span>
                <input id="pe-badge" value={p.badge} maxLength={40} onChange={(e) => set('badge', e.target.value)} placeholder="Yeni, Çok satan…" />
              </label>
              <label className="field" htmlFor="pe-sort">
                <span>Sıralama (küçük olan önce)</span>
                <input id="pe-sort" inputMode="numeric" value={String(p.sortOrder)} onChange={(e) => set('sortOrder', Number.parseInt(e.target.value, 10) || 0)} />
              </label>
            </section>
            <section className="panel">
              <h2>Arama motoru</h2>
              <label className="field" htmlFor="pe-seot">
                <span>Başlık</span>
                <input id="pe-seot" value={p.seoTitle} maxLength={120} onChange={(e) => set('seoTitle', e.target.value)} placeholder={p.name} />
              </label>
              <label className="field" htmlFor="pe-seod">
                <span>Açıklama</span>
                <textarea id="pe-seod" rows={3} value={p.seoDescription} maxLength={300} onChange={(e) => set('seoDescription', e.target.value)} placeholder={p.summary} />
              </label>
            </section>
            <div className="save-bar">
              <button type="submit" className="btn btn-primary" disabled={pending || uploading > 0} data-testid="urun-kaydet">
                {pending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              {p.id && initial.slug ? (
                <Link href={`/urun/${initial.slug}`} target="_blank" className="btn btn-ghost btn-sm">
                  Mağazada gör
                </Link>
              ) : null}
              <FormMessage state={state} testId="urun-kayit-mesaji" />
            </div>
          </div>
        </div>
      </form>

      {p.id ? (
        <section className="panel" style={{ maxWidth: 520 }}>
          <h2>Ürünü sil</h2>
          <p className="hint">Silinen ürün mağazadan kalkar; geçmiş siparişlerdeki kaydı korunur. Geçici olarak kaldırmak için &quot;Satışta&quot; kutusunu kapatman yeterli.</p>
          <form className="form" onSubmit={del.onSubmit} noValidate>
            <input type="hidden" name="id" value={p.id} />
            <label className="check">
              <input type="checkbox" name="onay" />
              <span>Eminim, bu ürünü sil</span>
            </label>
            <div className="form-foot">
              <button type="submit" className="btn btn-danger btn-sm" disabled={del.pending}>
                Ürünü sil
              </button>
              <FormMessage state={del.state} />
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
