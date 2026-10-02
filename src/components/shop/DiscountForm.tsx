'use client';

import { applyDiscount } from '@/app/actions/cart';
import { FormMessage, useFormAction } from '../forms';

export function DiscountForm() {
  const { state, pending, onSubmit } = useFormAction(applyDiscount);
  return (
    <form className="discount" onSubmit={onSubmit} noValidate>
      <label htmlFor="indirim-kodu" className="sr-only">
        İndirim kodu
      </label>
      <div className="inline-field">
        <input id="indirim-kodu" name="code" placeholder="İndirim kodu" autoComplete="off" />
        <button type="submit" className="btn btn-line" disabled={pending}>
          {pending ? '…' : 'Uygula'}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
