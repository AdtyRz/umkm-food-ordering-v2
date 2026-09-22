/**
 * Utils murni (tanpa dependency server) — dipakai di client & server.
 */
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PromoType,
  StoreOpenStatus,
  StoreStatusMode,
} from '@/types';
import { DAY_NAMES, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/constants';

// ============================================================
// FORMAT
// ============================================================
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeStyle: 'short',
  }).format(new Date(value));
}

/** "10:00:00" → "10:00" */
export function formatHourRange(open: string, close: string): string {
  return `${open.slice(0, 5)} - ${close.slice(0, 5)}`;
}

export function formatDayHours(
  dayOfWeek: number,
  openTime: string,
  closeTime: string,
  isClosed: boolean
): string {
  if (isClosed) return `${DAY_NAMES[dayOfWeek]}: Tutup`;
  return `${DAY_NAMES[dayOfWeek]}: ${formatHourRange(openTime, closeTime)}`;
}

// ============================================================
// SLUG & TOKEN FORMAT
// ============================================================
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Validasi format token customer: UMKM-XXXXX-XXXXX */
export function isValidCustomerTokenFormat(token: string): boolean {
  return /^UMKM-[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/.test(
    token.toUpperCase().trim()
  );
}

/** Validasi format token order: ORD-XXXXXX */
export function isValidOrderTokenFormat(token: string): boolean {
  return /^ORD-[2-9A-HJ-NP-Z]{6}$/.test(token.toUpperCase().trim());
}

// ============================================================
// PROMO CALCULATION
// ============================================================
export type PromoInput = {
  type: PromoType;
  value: number;
  minimumPurchase: number;
  maximumDiscount: number | null;
};

/**
 * Kalkulasi diskon promo. Murni & deterministik.
 * Returns null jika promo tidak berlaku (minimum belum terpenuhi).
 */
export function calculatePromoDiscount(
  subtotal: number,
  promo: PromoInput
): number | null {
  if (promo.minimumPurchase > 0 && subtotal < promo.minimumPurchase) return null;

  let discount: number;
  if (promo.type === 'percentage') {
    discount = Math.floor((subtotal * promo.value) / 100);
    if (promo.maximumDiscount != null) {
      discount = Math.min(discount, promo.maximumDiscount);
    }
  } else {
    discount = Math.min(promo.value, subtotal);
  }

  return Math.max(0, Math.min(discount, subtotal));
}

// ============================================================
// STORE STATUS
// ============================================================
export type OperatingHourRow = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

/**
 * Menentukan status buka/tutup toko dari jam operasional + timezone.
 * `now` bisa diinjeksi untuk testing.
 */
export function computeStoreOpenStatus(
  hours: OperatingHourRow[],
  mode: StoreStatusMode,
  manualStatus: boolean,
  timezone = 'Asia/Jakarta',
  now: Date = new Date()
): StoreOpenStatus {
  // Mode override admin menang
  if (mode === 'force_closed') {
    return {
      isOpen: false,
      source: 'manual',
      message: 'Toko sedang tutup.',
    };
  }
  if (mode === 'force_open') {
    return {
      isOpen: true,
      source: 'manual',
      message: 'Buka paksa oleh admin.',
    };
  }

  // Automatic: hitung dari jam operasional di timezone toko
  let localDay: number;
  let localMinutes: number;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    localDay = days.indexOf(map.weekday ?? 'Sun');
    const hour = parseInt(map.hour ?? '0', 10) % 24;
    localMinutes = hour * 60 + parseInt(map.minute ?? '0', 10);
  } catch {
    // Timezone tidak dikenal → fallback ke jam lokal server
    localDay = now.getDay();
    localMinutes = now.getHours() * 60 + now.getMinutes();
  }

  const today = hours.find((h) => h.dayOfWeek === localDay);
  if (!today || today.isClosed) {
    return {
      isOpen: false,
      source: 'automatic',
      todayHours: today
        ? {
            openTime: today.openTime,
            closeTime: today.closeTime,
            isClosed: true,
          }
        : null,
      message: 'Toko tutup hari ini.',
    };
  }

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const openM = toMinutes(today.openTime);
  const closeM = toMinutes(today.closeTime);

  // Menangani lintas tengah malam (close < open), mis. 16:00-02:00
  const isOpen =
    closeM > openM
      ? localMinutes >= openM && localMinutes < closeM
      : localMinutes >= openM || localMinutes < closeM;

  return {
    isOpen,
    source: 'automatic',
    todayHours: {
      openTime: today.openTime,
      closeTime: today.closeTime,
      isClosed: false,
    },
    message: isOpen
      ? null
      : `Toko buka ${formatHourRange(today.openTime, today.closeTime)}.`,
  };
}

// ============================================================
// PENGUMUMAN BUKA/TUTUP (auto-caption medsos/WA)
// ============================================================
export type AnnouncementInput = {
  storeName: string;
  isOpen: boolean;
  todayHours?: { openTime: string; closeTime: string; isClosed: boolean } | null;
  menuUrl?: string;
};

/**
 * Teks siap-posting untuk status medsos/WA. Selalu panggil dengan data
 * status toko TERKINI saat tombol ditekan — jangan cache hasilnya.
 */
export function buildAnnouncementText({
  storeName,
  isOpen,
  todayHours,
  menuUrl = '/menu',
}: AnnouncementInput): string {
  const name = storeName.trim() || 'Toko kami';
  const link = `Menu lengkap + stok realtime: ${menuUrl}`;
  const hhmm = (t: string) => t.slice(0, 5);

  if (isOpen) {
    if (todayHours && !todayHours.isClosed) {
      return `${name} BUKA sampai ${hhmm(todayHours.closeTime)} hari ini! ${link}`;
    }
    return `${name} BUKA sekarang! ${link}`;
  }
  if (todayHours && !todayHours.isClosed) {
    return `${name} sedang tutup. Buka lagi hari ini pukul ${hhmm(todayHours.openTime)}. ${link}`;
  }
  return `${name} sedang tutup hari ini. Sampai jumpa lagi! ${link}`;
}

export type BroadcastProduct = { name: string; price: number };

/**
 * Daftar produk tersedia hari ini dalam teks rapi untuk status WA/grup.
 * `products` harus sudah terfilter tersedia & stok tidak habis.
 */
export function buildBroadcastText(
  storeName: string,
  isOpen: boolean,
  products: BroadcastProduct[]
): string {
  const name = storeName.trim() || 'Toko kami';
  const lines: string[] = [];
  lines.push(`*${name}*`);
  lines.push(isOpen ? '✅ BUKA sekarang!' : '⛔ Sedang tutup');
  lines.push('');
  lines.push('/menu — Menu lengkap + stok realtime');
  lines.push('');
  lines.push('✨ Menu tersedia hari ini:');
  if (products.length === 0) {
    lines.push('— Lihat /menu untuk info selanjutnya —');
  } else {
    for (const p of products) {
      lines.push(`${p.name} — ${formatRupiah(p.price)}`);
    }
  }
  lines.push('');
  lines.push('Pesan tanpa login, cukup token: /menu');
  return lines.join('\n');
}

/**
 * Pesan konfirmasi untuk customer setelah menekan "Sudah Bayar" / mengirim
 * bukti transfer QRIS. Memberi arahan langkah berikutnya (verifikasi manual).
 */
export function paymentConfirmationMessage(
  context: {
    customerName?: string | null;
    orderToken: string;
    total: number;
  }
): string {
  const name = context.customerName || 'Kak';
  return [
    `Halo ${name},`,
    '',
    `Konfirmasi pembayaran untuk pesanan *${context.orderToken}* sudah kami terima.`,
    `Total: ${formatRupiah(context.total)}`,
    '',
    '📌 Langkah selanjutnya:',
    '1. Admin akan cek mutasi rekening/e-wallet kami.',
    '2. Setelah cocok, status pembayaran jadi Dibayar & pesanan langsung diproses.',
    '3. Pantau statusnya di halaman pesanan — tidak perlu chat dulu.',
    '',
    '⏳ Verifikasi manual biasanya cepat. Terima kasih!',
  ].join('\n');
}

// ============================================================
// ORDER STATUS HELPERS
// ============================================================
export function isOrderTerminal(status: OrderStatus): boolean {
  return status === 'completed' || status === 'rejected' || status === 'cancelled';
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status];
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return method === 'qris' ? 'QRIS' : 'COD / Tunai';
}

/** Pesan ramah per perubahan status untuk notifikasi WhatsApp. */
export function statusNotificationMessage(
  status: OrderStatus,
  context: {
    customerName?: string | null;
    orderToken: string;
    total: number;
    customerToken?: string | null;
  }
): string {
  const lines: string[] = [];
  const name = context.customerName || 'Kak';
  lines.push(`Halo ${name},`);
  lines.push('');
  lines.push(`Pesanan kamu *${context.orderToken}*`);
  const statusText = ORDER_STATUS_LABELS[status];
  if (status === 'pending') lines.push('telah kami terima dan sedang menunggu persetujuan.');
  else if (status === 'approved') lines.push('telah disetujui dan akan segera diproses.');
  else if (status === 'processing') lines.push('saat ini sedang diproses.');
  else if (status === 'ready') lines.push('sudah siap! Silakan diambil / diantar.');
  else if (status === 'delivering') lines.push('sedang diantar ke lokasimu.');
  else if (status === 'completed') lines.push('telah selesai. Terima kasih sudah memesan!');
  else if (status === 'rejected') lines.push('sayangnya ditolak. Silakan hubungi kami untuk info lebih lanjut.');
  else if (status === 'cancelled') lines.push('telah dibatalkan.');

  lines.push('');
  lines.push(`Status: ${statusText}`);
  lines.push(`Total: ${formatRupiah(context.total)}`);

  // Arahan/praktis per status — customer tahu harus apa selanjutnya
  if (status === 'pending') {
    lines.push('');
    lines.push('📌 Pantau status pesanan di halaman pesanan — tidak perlu chat kami dulu.');
  } else if (status === 'approved') {
    lines.push('');
    if (context.customerToken) {
      lines.push('📌 Simpan token kamu agar bisa buka halaman pesanan kapan saja:');
      lines.push(`*${context.customerToken}*`);
      lines.push('Simpan pesan ini — token dipakai juga untuk pesan berikutnya tanpa isi nama & No. HP lagi.');
    } else {
      lines.push('📌 Simpan token pesananmu sampai pesanan selesai.');
    }
  } else if (status === 'completed') {
    lines.push('');
    lines.push('Terima kasih sudah memesan — sampai jumpa di pesanan berikutnya! 🙏');
  } else if (status === 'rejected') {
    lines.push('');
    lines.push('📌 Jika pembayaran sudah dibuat, akan kami kembalikan. Hubungi kami untuk bantuan.');
  }

  return lines.join('\n');
}
