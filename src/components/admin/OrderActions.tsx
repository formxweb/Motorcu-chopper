'use client';

import type { ReactNode } from 'react';
import { orderAction } from '@/app/actions/admin-orders';
import type { OrderStatus } from '@/db/schema';
import { kurusToInput } from '@/lib/money';
import { FormMessage, useFormAction } from '../forms';

function OpForm({ orderId, op, children, submit, danger = false, testId }: { orderId: string; op: string; children?: ReactNode; submit: string; danger?: boolean; testId?: string }) {
  const { state, pending, onSubmit } = useFormAction(orderAction);
  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid={testId}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="op" value={op} />
      {children}
      <div className="form-foot">
        <button type="submit" className={danger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'} disabled={pending}>
          {pending ? 'İşleniyor…' : submit}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function OrderActions({
  orderId,
  status,
  requestType,
  carriers,
  carrierName,
  trackingNumber,
  refundable,
}: {
  orderId: string;
  status: OrderStatus;
  requestType: '' | 'cancel' | 'return';
  carriers: { id: string; name: string }[];
  carrierName: string;
  trackingNumber: string;
  refundable: number;
}) {
  const canShip = status === 'paid' || status === 'preparing' || status === 'shipped';
  const canCancel = status === 'paid' || status === 'preparing' || status === 'shipped';
  const canRefund = ['shipped', 'delivered', 'return_requested', 'refunded'].includes(status) && refundable > 0;
  const currentCarrier = carriers.find((c) => c.name === carrierName)?.id ?? carriers[0]?.id ?? '';

  return (
    <div className="op-forms">
      {status === 'paid' ? (
        <OpForm orderId={orderId} op="hazirla" submit="Hazırlanıyor olarak işaretle" testId="op-hazirla" />
      ) : null}

      {canShip ? (
        <details className="op" open={status !== 'shipped'}>
          <summary>{status === 'shipped' ? 'Kargo bilgisini güncelle' : 'Kargoya ver'}</summary>
          <OpForm orderId={orderId} op="kargola" submit={status === 'shipped' ? 'Kargo bilgisini kaydet' : 'Kargoya verildi olarak işaretle'} testId="op-kargola">
            <div className="grid-2">
              <label className="field" htmlFor="carrier">
                <span>Kargo firması</span>
                <select id="carrier" name="carrier" defaultValue={currentCarrier}>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="trackingNumber">
                <span>Takip numarası</span>
                <input id="trackingNumber" name="trackingNumber" defaultValue={trackingNumber} autoComplete="off" />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" name="notify" defaultChecked />
              <span>Müşteriye kargo e-postası gönder</span>
            </label>
          </OpForm>
        </details>
      ) : null}

      {status === 'shipped' ? (
        <OpForm orderId={orderId} op="teslim" submit="Teslim edildi olarak işaretle" testId="op-teslim">
          <label className="check">
            <input type="checkbox" name="notify" defaultChecked />
            <span>Müşteriye teslim e-postası gönder</span>
          </label>
        </OpForm>
      ) : null}

      {requestType ? (
        <details className="op" open>
          <summary>Talebi reddet</summary>
          <OpForm orderId={orderId} op="reddet" submit="Talebi reddet ve müşteriye bildir" testId="op-reddet">
            <label className="field" htmlFor="reject-note">
              <span>Müşteriye açıklama</span>
              <textarea id="reject-note" name="note" rows={2} placeholder="Sipariş kargoya verildiği için iptal edilemiyor…" />
            </label>
          </OpForm>
        </details>
      ) : null}

      {canRefund ? (
        <details className="op" open={status === 'return_requested'}>
          <summary>{status === 'return_requested' ? 'İadeyi onayla ve ücreti iade et' : 'Ücret iadesi yap'}</summary>
          <OpForm key={`iade-${refundable}`} orderId={orderId} op="iade" submit="İadeyi gönder" danger testId="op-iade">
            <div className="grid-2">
              <label className="field" htmlFor="amount">
                <span>İade tutarı (TL)</span>
                <input id="amount" name="amount" inputMode="decimal" defaultValue={kurusToInput(refundable)} />
              </label>
              <label className="field" htmlFor="refund-note">
                <span>Müşteriye not (isteğe bağlı)</span>
                <input id="refund-note" name="note" />
              </label>
            </div>
            <label className="check">
              <input type="checkbox" name="restock" defaultChecked />
              <span>Ürünleri stoğa geri ekle</span>
            </label>
            <label className="check">
              <input type="checkbox" name="onay" />
              <span>Eminim, bu tutar kartına iade edilsin</span>
            </label>
          </OpForm>
        </details>
      ) : null}

      {canCancel ? (
        <details className="op" open={requestType === 'cancel'}>
          <summary>Siparişi iptal et ve ücreti iade et</summary>
          <OpForm orderId={orderId} op="iptal" submit="İptal et ve iade et" danger testId="op-iptal">
            <label className="field" htmlFor="reason">
              <span>Müşteriye gidecek açıklama (isteğe bağlı)</span>
              <input id="reason" name="reason" placeholder="Talebin üzerine iptal edildi." />
            </label>
            <label className="check">
              <input type="checkbox" name="restock" defaultChecked />
              <span>Ürünleri stoğa geri ekle</span>
            </label>
            <label className="check">
              <input type="checkbox" name="onay" />
              <span>Eminim, sipariş iptal edilsin ve ödeme iade edilsin</span>
            </label>
          </OpForm>
        </details>
      ) : null}

      <details className="op">
        <summary>Not ekle</summary>
        <OpForm orderId={orderId} op="not" submit="Notu kaydet" testId="op-not">
          <label className="field" htmlFor="message">
            <span>Not</span>
            <textarea id="message" name="message" rows={2} />
          </label>
          <label className="check">
            <input type="checkbox" name="isPublic" />
            <span>Müşteri sipariş sayfasında görsün</span>
          </label>
          <label className="check">
            <input type="checkbox" name="notify" />
            <span>Müşteriye e-postayla da gönder (yalnızca müşterinin gördüğü notlar)</span>
          </label>
        </OpForm>
      </details>
    </div>
  );
}
