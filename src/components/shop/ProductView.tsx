'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { addToCart } from '@/app/actions/cart';
import type { ColorOption, CustomField } from '@/db/schema';
import { discountPercent, formatTL } from '@/lib/money';
import { FormMessage, useFormAction } from '../forms';

type Img = { id: string; url: string; thumbUrl: string; alt: string; color: string };
type Variant = { id: string; color: string; size: string; stock: number; priceOverride: number | null; isActive: boolean };

export type ProductViewProps = {
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    colorLabel: string;
    sizeLabel: string;
    colors: ColorOption[];
    sizes: string[];
    customFields: CustomField[];
    trackStock: boolean;
    isPersonalized: boolean;
  };
  images: Img[];
  variants: Variant[];
  shipText: string;
  showSizeGuide: boolean;
  favorite: React.ReactNode;
};

export function ProductView({ product, images, variants, shipText, showSizeGuide, favorite }: ProductViewProps) {
  const p = product;
  const hasColors = p.colors.length > 0;
  const hasSizes = p.sizes.length > 0;
  const active = variants.filter((v) => v.isActive);
  const inStock = (v: Variant | undefined) => !!v && (!p.trackStock || v.stock > 0);

  const firstColor = useMemo(() => {
    if (!hasColors) return '';
    const withStock = p.colors.find((c) => active.some((v) => v.color === c.name && inStock(v)));
    return (withStock ?? p.colors[0]).name;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [color, setColor] = useState(firstColor);
  const [size, setSize] = useState(hasSizes ? '' : '');
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const { state, pending, onSubmit } = useFormAction(addToCart);

  const gallery = useMemo(() => {
    const list = images.filter((i) => !i.color || i.color === color);
    return list.length ? list : images;
  }, [images, color]);
  const current = gallery[Math.min(imgIdx, gallery.length - 1)];

  const variant = active.find((v) => v.color === (hasColors ? color : '') && v.size === (hasSizes ? size : ''));
  const price = variant?.priceOverride ?? p.price;
  const pct = discountPercent(price, p.compareAtPrice);
  const needSize = hasSizes && !size;

  let stockText = '';
  let stockTone = '';
  if (needSize) stockText = '';
  else if (!variant) {
    stockText = 'Bu seçenek satışta değil';
    stockTone = 'bad';
  } else if (p.trackStock && variant.stock <= 0) {
    stockText = 'Tükendi';
    stockTone = 'bad';
  } else if (p.trackStock && variant.stock <= 3) {
    stockText = `Son ${variant.stock} ürün`;
    stockTone = 'warn';
  } else {
    stockText = p.isPersonalized ? 'Siparişe özel hazırlanır' : 'Stokta';
    stockTone = 'ok';
  }
  const maxQty = p.trackStock && variant ? Math.max(1, Math.min(20, variant.stock)) : 20;
  const canBuy = !!variant && inStock(variant);

  return (
    <div className="pv">
      <div className="pv-gallery">
        <div className="pv-main">
          {current ? <img src={current.url} alt={current.alt || p.name} width={1000} height={1250} /> : <span className="card-noimg">Görsel yok</span>}
        </div>
        {gallery.length > 1 ? (
          <div className="pv-thumbs" role="list">
            {gallery.map((g, i) => (
              <button
                type="button"
                key={g.id}
                className={i === imgIdx ? 'on' : ''}
                onClick={() => setImgIdx(i)}
                aria-label={`${i + 1}. görseli göster`}
                aria-pressed={i === imgIdx}
              >
                <img src={g.thumbUrl} alt="" width={120} height={150} loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
        {p.customFields.length ? <p className="small muted">Görseldeki yazılar örnektir; armada senin yazdığın metin işlenir.</p> : null}
      </div>

      <div className="pv-buy">
        <div className="pv-title">
          <h1>{p.name}</h1>
          {favorite}
        </div>
        <p className="price price-lg">
          <span className="price-now" data-testid="urun-fiyat">
            {formatTL(price)}
          </span>
          {pct > 0 && p.compareAtPrice ? (
            <>
              <s className="price-was">{formatTL(p.compareAtPrice)}</s>
              <span className="price-off">%{pct}</span>
            </>
          ) : null}
        </p>

        <form className="pv-form" onSubmit={onSubmit} noValidate data-testid="sepete-ekle-formu">
        {hasColors ? (
          <fieldset className="opt">
            <legend>
              <span>
                {p.colorLabel}: <strong>{color}</strong>
              </span>
            </legend>
            <div className="swatches">
              {p.colors.map((c) => {
                const any = active.some((v) => v.color === c.name && inStock(v));
                return (
                  <button
                    type="button"
                    key={c.name}
                    className={c.name === color ? 'sw on' : any ? 'sw' : 'sw sw-out'}
                    aria-pressed={c.name === color}
                    onClick={() => {
                      setColor(c.name);
                      setImgIdx(0);
                    }}
                  >
                    <i style={{ background: c.hex }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {hasSizes ? (
          <fieldset className="opt">
            <legend>
              <span>{p.sizeLabel}</span>
              {showSizeGuide ? (
                <Link href="/beden-tablosu" className="lnk" target="_blank">
                  Beden tablosu
                </Link>
              ) : null}
            </legend>
            <div className="sizes">
              {p.sizes.map((s) => {
                const v = active.find((x) => x.color === (hasColors ? color : '') && x.size === s);
                const ok = inStock(v);
                return (
                  <button
                    type="button"
                    key={s}
                    className={s === size ? 'size on' : ok ? 'size' : 'size size-out'}
                    aria-pressed={s === size}
                    disabled={!ok}
                    onClick={() => setSize(s)}
                    title={ok ? undefined : 'Tükendi'}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {p.customFields.map((f) => (
          <label className="field" key={f.key} htmlFor={`ozel_${f.key}`}>
            <span>
              {f.label}
              {f.required ? '' : ' (isteğe bağlı)'}
            </span>
            <input
              id={`ozel_${f.key}`}
              name={`ozel_${f.key}`}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              value={custom[f.key] ?? ''}
              onChange={(e) => setCustom({ ...custom, [f.key]: e.target.value })}
              autoComplete="off"
            />
            <small className="counter">
              {(custom[f.key] ?? '').length}/{f.maxLength}
            </small>
          </label>
        ))}

        <input type="hidden" name="variantId" value={variant?.id ?? ''} />
        <input type="hidden" name="quantity" value={qty} />

        {stockText ? (
          <p className={`stock stock-${stockTone}`} data-testid="stok-durumu">
            {stockText}
          </p>
        ) : null}

        <div className="pv-actions">
          <div className="qty" role="group" aria-label="Adet">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Bir azalt">
              −
            </button>
            <output aria-live="polite">{qty}</output>
            <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="Bir arttır">
              +
            </button>
          </div>
          <button type="submit" className="btn btn-primary btn-lg grow" disabled={pending || (!needSize && !canBuy)} data-testid="sepete-ekle">
            {pending ? 'Ekleniyor…' : needSize ? `${p.sizeLabel} seç` : canBuy ? 'Sepete ekle' : 'Tükendi'}
          </button>
        </div>
        {state.message ? (
          <div className="added">
            <FormMessage state={state} testId="sepet-mesaji" />
            {state.ok ? (
              <Link href="/sepet" className="btn btn-line btn-sm">
                Sepete git
              </Link>
            ) : null}
          </div>
        ) : null}
        <p className="ship-note">{shipText}</p>
        </form>
      </div>
    </div>
  );
}
