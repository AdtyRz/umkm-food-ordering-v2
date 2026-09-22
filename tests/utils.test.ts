import { describe, expect, it } from 'vitest';
import {
  buildAnnouncementText,
  buildBroadcastText,
  calculatePromoDiscount,
  computeStoreOpenStatus,
  formatRupiah,
  isValidCustomerTokenFormat,
  isValidOrderTokenFormat,
  paymentConfirmationMessage,
  slugify,
} from '@/utils';
import { ORDER_STATUS_TRANSITIONS } from '@/constants';
import { ORDER_STATUS_LABELS } from '@/constants';
import type { OrderStatus } from '@/types';

// ============================================================
// FORMAT
// ============================================================
describe('formatRupiah', () => {
  it('memformat angka jadi rupiah', () => {
    expect(formatRupiah(35000)).toContain('35.000');
  });
  it('menangani nol', () => {
    expect(formatRupiah(0)).toContain('0');
  });
});

describe('slugify', () => {
  it('mengubah judul jadi slug', () => {
    expect(slugify('Nasi Goreng Spesial!')).toBe('nasi-goreng-spesial');
  });
  it('membersihkan spasi ganda & simbol', () => {
    expect(slugify('  Es  Teh___Manis ?? ')).toBe('es-teh-manis');
  });
});

// ============================================================
// TOKEN FORMAT
// ============================================================
describe('token format', () => {
  it('token customer valid', () => {
    expect(isValidCustomerTokenFormat('UMKM-7XK9P-Q2M4N')).toBe(true);
  });
  it('token customer menolak karakter membingungkan', () => {
    expect(isValidCustomerTokenFormat('UMKM-O0I1L-54321')).toBe(false);
  });
  it('token customer menolak format salah', () => {
    expect(isValidCustomerTokenFormat('UMKM-123-456')).toBe(false);
    expect(isValidCustomerTokenFormat('hello')).toBe(false);
  });
  it('token order valid', () => {
    expect(isValidOrderTokenFormat('ORD-8F4K2P')).toBe(true);
  });
  it('token order menolak format salah', () => {
    expect(isValidOrderTokenFormat('ORD-12')).toBe(false);
  });
});

// ============================================================
// PROMO
// ============================================================
describe('calculatePromoDiscount', () => {
  it('percentage tanpa maks', () => {
    expect(
      calculatePromoDiscount(100000, { type: 'percentage', value: 10, minimumPurchase: 0, maximumDiscount: null })
    ).toBe(10000);
  });
  it('percentage dengan maks diskon', () => {
    expect(
      calculatePromoDiscount(200000, { type: 'percentage', value: 50, minimumPurchase: 0, maximumDiscount: 20000 })
    ).toBe(20000);
  });
  it('fixed amount', () => {
    expect(
      calculatePromoDiscount(50000, { type: 'fixed_amount', value: 5000, minimumPurchase: 0, maximumDiscount: null })
    ).toBe(5000);
  });
  it('fixed amount tidak melebihi subtotal', () => {
    expect(
      calculatePromoDiscount(3000, { type: 'fixed_amount', value: 5000, minimumPurchase: 0, maximumDiscount: null })
    ).toBe(3000);
  });
  it('menolak jika minimum belanja belum terpenuhi', () => {
    expect(
      calculatePromoDiscount(20000, { type: 'fixed_amount', value: 5000, minimumPurchase: 25000, maximumDiscount: null })
    ).toBeNull();
  });
  it('diskon tidak pernah negatif', () => {
    expect(
      calculatePromoDiscount(1000, { type: 'percentage', value: 10, minimumPurchase: 0, maximumDiscount: null })
    ).toBe(100);
  });
});

// ============================================================
// STORE STATUS
// ============================================================
describe('computeStoreOpenStatus', () => {
  const hours = [
    { dayOfWeek: 0, openTime: '10:00', closeTime: '22:00', isClosed: true }, // Minggu
    { dayOfWeek: 1, openTime: '10:00', closeTime: '22:00', isClosed: false },
  ];

  it('force_closed selalu tutup', () => {
    const status = computeStoreOpenStatus(hours, 'force_closed', true, 'Asia/Jakarta', new Date());
    expect(status.isOpen).toBe(false);
    expect(status.source).toBe('manual');
  });

  it('force_open selalu buka', () => {
    const status = computeStoreOpenStatus(hours, 'force_open', true, 'Asia/Jakarta', new Date());
    expect(status.isOpen).toBe(true);
    expect(status.source).toBe('manual');
  });

  it('automatic: buka pada jam operasional Senin', () => {
    // Senin 12:00 UTC+7 → 05:00 UTC
    const mondayNoon = new Date('2026-01-05T05:00:00Z'); // Senin
    const status = computeStoreOpenStatus(hours, 'automatic', false, 'Asia/Jakarta', mondayNoon);
    expect(status.isOpen).toBe(true);
  });

  it('automatic: tutup di luar jam (Senin pagi 08:00 WIB)', () => {
    const mondayMorning = new Date('2026-01-05T01:00:00Z'); // 08:00 WIB
    const status = computeStoreOpenStatus(hours, 'automatic', false, 'Asia/Jakarta', mondayMorning);
    expect(status.isOpen).toBe(false);
  });

  it('automatic: Minggu tutup sesuai jadwal', () => {
    const sunday = new Date('2026-01-04T05:00:00Z'); // Minggu 12:00 WIB
    const status = computeStoreOpenStatus(hours, 'automatic', false, 'Asia/Jakarta', sunday);
    expect(status.isOpen).toBe(false);
    expect(status.todayHours?.isClosed).toBe(true);
  });

  it('menangani jam lintas tengah malam', () => {
    const overnight = [
      { dayOfWeek: 1, openTime: '16:00', closeTime: '02:00', isClosed: false },
    ];
    // Senin 23:00 WIB → masih buka
    const lateNight = new Date('2026-01-05T16:00:00Z');
    const status = computeStoreOpenStatus(overnight, 'automatic', false, 'Asia/Jakarta', lateNight);
    expect(status.isOpen).toBe(true);
  });
});

// ============================================================
// PENGUMUMAN BUKA/TUTUP
// ============================================================
describe('buildAnnouncementText', () => {
  const today = { openTime: '10:00:00', closeTime: '21:00:00', isClosed: false };

  it('buka: sebut jam tutup hari ini', () => {
    expect(
      buildAnnouncementText({ storeName: 'Kedai Rasa', isOpen: true, todayHours: today })
    ).toBe('Kedai Rasa BUKA sampai 21:00 hari ini! Menu lengkap + stok realtime: /menu');
  });

  it('buka paksa tanpa jam: tanpa jam tutup', () => {
    const text = buildAnnouncementText({ storeName: 'Kedai Rasa', isOpen: true, todayHours: null });
    expect(text).toBe('Kedai Rasa BUKA sekarang! Menu lengkap + stok realtime: /menu');
  });

  it('tutup sementara: sebut jam buka berikutnya', () => {
    expect(
      buildAnnouncementText({ storeName: 'Kedai Rasa', isOpen: false, todayHours: today })
    ).toBe('Kedai Rasa sedang tutup. Buka lagi hari ini pukul 10:00. Menu lengkap + stok realtime: /menu');
  });

  it('tutup sepanjang hari', () => {
    const closed = { openTime: '10:00', closeTime: '21:00', isClosed: true };
    const text = buildAnnouncementText({ storeName: 'Kedai Rasa', isOpen: false, todayHours: closed });
    expect(text).toContain('tutup hari ini');
    expect(text).not.toContain('pukul');
  });

  it('memakai URL menu kustom', () => {
    const text = buildAnnouncementText({
      storeName: 'Kedai Rasa',
      isOpen: true,
      todayHours: today,
      menuUrl: 'https://kedairasa.id/menu',
    });
    expect(text).toContain('stok realtime: https://kedairasa.id/menu');
  });

  it('fallback nama toko kosong', () => {
    const text = buildAnnouncementText({ storeName: '   ', isOpen: true, todayHours: today });
    expect(text).toMatch(/^Toko kami BUKA/);
  });
});

describe('buildBroadcastText', () => {
  it('memuat nama toko, status, dan daftar produk berformat WA', () => {
    const text = buildBroadcastText('Kedai Rasa', true, [
      { name: 'Nasi Goreng', price: 15000 },
      { name: 'Es Teh', price: 5000 },
    ]);
    expect(text).toContain('*Kedai Rasa*');
    expect(text).toContain('✅ BUKA sekarang!');
    // NBSP: Intl.NumberFormat id-ID memakai non-breaking space setelah "Rp"
    expect(text).toMatch(/Nasi Goreng — Rp\s15\.000/);
    expect(text).toMatch(/Es Teh — Rp\s5\.000/);
    expect(text).toContain('/menu');
  });

  it('status tutup saat toko tutup', () => {
    const text = buildBroadcastText('Kedai Rasa', false, [{ name: 'Nasi Goreng', price: 15000 }]);
    expect(text).toContain('⛔ Sedang tutup');
    expect(text).not.toContain('BUKA');
  });

  it('menangani daftar produk kosong', () => {
    const text = buildBroadcastText('Kedai Rasa', true, []);
    expect(text).toContain('Menu tersedia hari ini:');
    expect(text).toContain('Lihat /menu untuk info selanjutnya');
    expect(text).not.toContain('— Rp');
  });

  it('fallback nama toko kosong', () => {
    const text = buildBroadcastText('  ', true, []);
    expect(text).toContain('*Toko kami*');
  });

  it('berakhir dengan ajakan pesan', () => {
    const text = buildBroadcastText('Kedai Rasa', true, []);
    expect(text.trimEnd().endsWith('Pesan tanpa login, cukup token: /menu')).toBe(true);
  });
});

// ============================================================
// PESAN KONFIRMASI PEMBAYARAN QRIS
// ============================================================
describe('paymentConfirmationMessage', () => {
  it('menyebut token pesanan & total', () => {
    const text = paymentConfirmationMessage({ orderToken: 'ORD-ABC123', total: 25000 });
    expect(text).toContain('ORD-ABC123');
    expect(text).toMatch(/Total:\s*Rp\s?25\.000/);
  });
  it('memakai sapaan fallback tanpa nama', () => {
    const text = paymentConfirmationMessage({ orderToken: 'ORD-ABC123', total: 10000 });
    expect(text).toContain('Halo Kak');
  });
  it('memberi arahan verifikasi manual', () => {
    const text = paymentConfirmationMessage({
      customerName: 'Budi',
      orderToken: 'ORD-ABC123',
      total: 10000,
    });
    expect(text).toContain('Halo Budi');
    expect(text).toContain('Admin akan cek mutasi');
    expect(text).toContain('Dibayar');
  });
});

// ============================================================
// BUSINESS RULES STATUS ORDER
// ============================================================
describe('order status rules', () => {
  it('pending hanya boleh approved/rejected', () => {
    expect(ORDER_STATUS_TRANSITIONS.pending).toEqual(['approved', 'rejected']);
  });
  it('status terminal tidak punya transisi', () => {
    expect(ORDER_STATUS_TRANSITIONS.completed).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.rejected).toEqual([]);
  });
  it('semua status punya label Indonesia', () => {
    const statuses: OrderStatus[] = [
      'pending', 'approved', 'processing', 'ready',
      'delivering', 'completed', 'rejected', 'cancelled',
    ];
    for (const s of statuses) {
      expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
