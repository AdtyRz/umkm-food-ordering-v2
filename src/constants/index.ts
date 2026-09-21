import type { OrderStatus, PaymentStatus, StockStatus } from '@/types';

/** Alphabet token tanpa karakter membingungkan (0/O, 1/I/L). */
export const TOKEN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const APP_CONFIG = {
  name: 'UMKM Food Ordering',
  /** Panjang segmen token customer: UMKM-XXXXX-XXXXX */
  customerTokenSegments: [5, 5] as const,
  /** Panjang token order: ORD-XXXXXX */
  orderTokenLength: 6,
  /** Batas qty per item */
  maxQuantityPerItem: 99,
} as const;

/** Urutan status utama pesanan untuk timeline customer. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'approved',
  'processing',
  'ready',
  'delivering',
  'completed',
];

/** Label Indonesia untuk status order. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  processing: 'Diproses',
  ready: 'Siap',
  delivering: 'Diantarkan',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

/** Label status pembayaran. */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Menunggu Pembayaran',
  waiting_verification: 'Menunggu Verifikasi',
  paid: 'Dibayar',
  failed: 'Gagal',
};

/** Label status stok. */
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  many: 'Masih Banyak',
  low: 'Sedikit Lagi',
  out: 'Habis',
};

/** Transisi status order yang valid (business rule PRD §23). */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

export const DAY_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;
