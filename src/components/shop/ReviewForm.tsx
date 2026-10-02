'use client';

import { useState } from 'react';
import { submitReview } from '@/app/actions/account';
import { IconStar } from '../icons';
import { FormMessage, useFormAction } from '../forms';

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { state, pending, onSubmit } = useFormAction(submitReview);
  const [rating, setRating] = useState(5);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form className="form review-form" onSubmit={onSubmit} noValidate>
      <h3>Yorum yaz</h3>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <div className="star-pick" role="radiogroup" aria-label="Puan">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={n === rating} aria-label={`${n} yıldız`} onClick={() => setRating(n)} className={n <= rating ? 'on' : ''}>
            <IconStar size={24} filled={n <= rating} />
          </button>
        ))}
      </div>
      <label className="field" htmlFor="yorum-body">
        <span>Yorumun</span>
        <textarea id="yorum-body" name="body" rows={4} maxLength={2000} placeholder="Kalıbı, derisi, dikişi nasıl? Hangi bedeni aldın?" />
      </label>
      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Gönderiliyor…' : 'Yorumu gönder'}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
