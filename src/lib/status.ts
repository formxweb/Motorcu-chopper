import type { OrderStatus } from '@/db/schema';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Ödeme bekleniyor',
  payment_failed: 'Ödeme alınamadı',
  paid: 'Sipariş alındı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
  return_requested: 'İade talebi',
  refunded: 'İade edildi',
};

/** Rozet rengi için anlam sınıfı */
export const STATUS_TONE: Record<OrderStatus, 'wait' | 'bad' | 'new' | 'work' | 'go' | 'done' | 'off'> = {
  pending_payment: 'wait',
  payment_failed: 'bad',
  paid: 'new',
  preparing: 'work',
  shipped: 'go',
  delivered: 'done',
  cancelled: 'off',
  return_requested: 'bad',
  refunded: 'off',
};

/** Müşteriye gösterilen ilerleme adımları */
export const PROGRESS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'paid', label: 'Alındı' },
  { key: 'preparing', label: 'Hazırlanıyor' },
  { key: 'shipped', label: 'Kargoda' },
  { key: 'delivered', label: 'Teslim edildi' },
];

export function progressIndex(s: OrderStatus): number {
  switch (s) {
    case 'paid':
      return 0;
    case 'preparing':
      return 1;
    case 'shipped':
      return 2;
    case 'delivered':
    case 'return_requested':
      return 3;
    default:
      return -1;
  }
}

/** Siparişler listesinde "işlem bekleyen" sayılan durumlar */
export const ACTIONABLE: OrderStatus[] = ['paid', 'preparing', 'return_requested'];
