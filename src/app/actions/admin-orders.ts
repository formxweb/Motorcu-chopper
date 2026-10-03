'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { parseTL } from '@/lib/money';
import {
  adminAddNote,
  adminCancel,
  adminConfirmPayment,
  adminDeliver,
  adminRefund,
  adminRejectRequest,
  adminSetPreparing,
  adminShip,
  cleanupExpiredOrders,
} from '@/lib/orders';
import { bool, isUuid, str } from '@/lib/utils';

export async function orderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const actor = admin.email;
  const id = str(fd, 'orderId');
  const op = str(fd, 'op');
  if (!isUuid(id)) return { ok: false, message: 'Sipariş bulunamadı.', at: Date.now() };
  let r: { ok: boolean; message: string };
  try {
    switch (op) {
      case 'hazirla':
        r = await adminSetPreparing(id, actor);
        break;
      case 'kargola':
        r = await adminShip(id, str(fd, 'carrier'), str(fd, 'trackingNumber'), actor, bool(fd, 'notify'));
        break;
      case 'teslim':
        r = await adminDeliver(id, actor, bool(fd, 'notify'));
        break;
      case 'iptal':
        if (!bool(fd, 'onay')) {
          r = { ok: false, message: 'İptal ve iade için "Eminim" kutusunu işaretle.' };
          break;
        }
        r = await adminCancel(id, str(fd, 'reason'), bool(fd, 'restock'), actor);
        break;
      case 'iade': {
        if (!bool(fd, 'onay')) {
          r = { ok: false, message: 'İade için "Eminim" kutusunu işaretle.' };
          break;
        }
        const amount = parseTL(str(fd, 'amount'));
        if (amount === null || amount <= 0) {
          r = { ok: false, message: 'İade tutarını yaz.' };
          break;
        }
        r = await adminRefund(id, amount, bool(fd, 'restock'), str(fd, 'note'), actor);
        break;
      }
      case 'reddet':
        r = await adminRejectRequest(id, str(fd, 'note'), actor);
        break;
      case 'odeme-onay':
        if (!bool(fd, 'onay')) {
          r = { ok: false, message: 'Onay için "Eminim" kutusunu işaretle.' };
          break;
        }
        r = await adminConfirmPayment(id, str(fd, 'paymentRef'), actor);
        break;
      case 'not':
        r = await adminAddNote(id, str(fd, 'message'), bool(fd, 'isPublic'), bool(fd, 'notify'), actor);
        break;
      default:
        r = { ok: false, message: 'Bilinmeyen işlem.' };
    }
  } catch (e) {
    console.error('[yönetim] sipariş işlemi', op, e);
    r = { ok: false, message: `İşlem tamamlanamadı: ${e instanceof Error ? e.message : 'bilinmeyen hata'}` };
  }
  revalidatePath(`/yonetim/siparisler/${id}`);
  revalidatePath('/yonetim/siparisler');
  return { ...r, at: Date.now() };
}

export async function runCleanup(): Promise<void> {
  await assertAdmin();
  await cleanupExpiredOrders(25);
  revalidatePath('/yonetim', 'layout');
}
