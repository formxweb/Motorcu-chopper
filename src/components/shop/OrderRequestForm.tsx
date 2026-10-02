'use client';

import { orderRequest } from '@/app/actions/account';
import { FormMessage, useFormAction } from '../forms';

export function OrderRequestForm({ number, token, kind }: { number: string; token: string; kind: 'cancel' | 'return' }) {
  const { state, pending, onSubmit } = useFormAction(orderRequest);
  if (state.ok) return <FormMessage state={state} testId="talep-mesaji" />;
  return (
    <details className="request">
      <summary className="btn btn-line btn-sm">{kind === 'cancel' ? 'İptal talebi oluştur' : 'İade talebi oluştur'}</summary>
      <form className="form" onSubmit={onSubmit} noValidate data-testid={kind === 'cancel' ? 'iptal-formu' : 'iade-formu'}>
        <input type="hidden" name="number" value={number} />
        <input type="hidden" name="t" value={token} />
        <input type="hidden" name="kind" value={kind} />
        <label className="field" htmlFor={`talep-${kind}`}>
          <span>{kind === 'cancel' ? 'İptal sebebi (isteğe bağlı)' : 'İade sebebi'}</span>
          <textarea
            id={`talep-${kind}`}
            name="note"
            rows={3}
            maxLength={500}
            placeholder={kind === 'cancel' ? 'Vazgeçtim, yanlış beden seçtim…' : 'Beden büyük geldi, M ile değişim istiyorum…'}
          />
        </label>
        <div className="form-foot">
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? 'Gönderiliyor…' : 'Talebi gönder'}
          </button>
          <FormMessage state={state} />
        </div>
      </form>
    </details>
  );
}
