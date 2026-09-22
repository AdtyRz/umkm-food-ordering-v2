'use server';

import { z } from 'zod';
import { getCustomerSession, touchSession } from '@/services/customer-session';
import { validatePromoCode } from '@/services/promo';
import { createOrder } from '@/services/order';
import { checkoutSchema } from '@/lib/validations';

export type PromoPreviewResult =
  | { ok: true; code: string; name: string; discount: number }
  | { ok: false; error: string };

export async function validatePromoAction(
  code: string,
  subtotal: number
): Promise<PromoPreviewResult> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, error: 'Sesi tidak ditemukan.' };

  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { ok: false, error: 'Subtotal tidak valid.' };
  }
  return validatePromoCode(code, subtotal);
}

export type CheckoutResult =
  | { ok: true; orderToken: string }
  | { ok: false; error: string };

/** Data pemesan tersimpan untuk prefill checkout berikutnya. */
export async function getCustomerProfileAction(): Promise<{
  ok: boolean;
  name: string;
  phone: string;
}> {
  const session = await getCustomerSession();
  if (!session) return { ok: false, name: '', phone: '' };
  const { db } = await import('@/db');
  const { customers } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');
  const [row] = await db
    .select({ name: customers.name, phone: customers.phone })
    .from(customers)
    .where(eq(customers.id, session.customerId))
    .limit(1);
  return { ok: true, name: row?.name ?? '', phone: row?.phone ?? '' };
}

/**
 * Buat order dari keranjang customer.
 * Seluruh validasi (session, produk, stok, promo, harga, status toko)
 * dilakukan di server — data dari browser tidak dipercaya.
 */
/** Info QRIS untuk popup pembayaran (dipanggil client saat checkout QRIS). */
export async function getQrisPaymentInfoAction(): Promise<{
  qrisImagePath: string | null;
  qrisReceiverName: string | null;
}> {
  const { getStoreInfo } = await import('@/services/store');
  const store = await getStoreInfo();
  return {
    qrisImagePath: store?.qrisImagePath ?? null,
    qrisReceiverName: store?.qrisReceiverName ?? null,
  };
}

export async function createOrderAction(rawInput: unknown): Promise<CheckoutResult> {
  // 1. Session wajib valid
  const session = await getCustomerSession();
  if (!session) {
    return {
      ok: false,
      error: 'Sesi kamu sudah berakhir. Silakan masukkan token kembali.',
    };
  }

  // 2. Validasi bentuk input
  const parsed = checkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Data tidak valid.';
    return { ok: false, error: firstError };
  }
  const input = parsed.data;

  // 3. Toko COD harus aktif (dicek dari DB)
  const { getStoreInfo } = await import('@/services/store');
  const store = await getStoreInfo();
  if (input.paymentMethod === 'cod' && store && !store.codEnabled) {
    return { ok: false, error: 'Pembayaran COD sedang tidak tersedia.' };
  }

  // 4. Buat order (semua aturan bisnis di dalam service)
  const result = await createOrder({
    sessionId: session.sessionId,
    customerId: session.customerId,
    name: input.name,
    phone: input.phone,
    note: input.note || null,
    paymentMethod: input.paymentMethod,
    promoCode: input.promoCode || null,
    items: input.items,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await touchSession(session.sessionId);
  return { ok: true, orderToken: result.orderToken };
}

// ============================================================
// QRIS: BUKTI TRANSFER & KONFIRMASI "SUDAH BAYAR"
// ============================================================

/**
 * Upload bukti transfer (WAJIB) + tandai menunggu verifikasi.
 * Order wajib milik session pemanggil (Rule 14). Tanpa bukti, permintaan
 * ditolak — konfirmasi "sudah bayar" tanpa bukti membuka celah penipuan.
 */
export async function submitPaymentProofAction(
  orderToken: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await getCustomerSession();
    if (!session) return { ok: false, error: 'Sesi berakhir. Masukkan token kembali.' };

    // 1. Order harus milik session ini
    const { db } = await import('@/db');
    const { orders } = await import('@/db/schema');
    const { and, eq } = await import('drizzle-orm');
    const [order] = await db
      .select({ id: orders.id, paymentMethod: orders.paymentMethod, paymentStatus: orders.paymentStatus })
      .from(orders)
      .where(and(eq(orders.orderToken, orderToken), eq(orders.sessionId, session.sessionId)))
      .limit(1);
    if (!order) return { ok: false, error: 'Pesanan tidak ditemukan.' };
    if (order.paymentMethod !== 'qris') {
      return { ok: false, error: 'Pesanan ini bukan pembayaran QRIS.' };
    }
    if (order.paymentStatus === 'paid') {
      return { ok: false, error: 'Pesanan ini sudah dibayar.' };
    }

    // 2. Validasi file sama seperti upload admin (PRD §84)
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Bukti transfer wajib dilampirkan.' };
    }
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) return { ok: false, error: 'Format harus JPG/PNG/WebP.' };
    if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Ukuran maksimal 2MB.' };

    const { saveUploadedImage } = await import('@/lib/storage');
    const proofPath = await saveUploadedImage(file, 'proofs');

    // 3. Simpan path bukti + status menunggu verifikasi (sekali transaction)
    const { payments } = await import('@/db/schema');
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({ proofPath, status: 'waiting_verification' })
        .where(eq(payments.orderId, order.id));
      await tx
        .update(orders)
        .set({ paymentStatus: 'waiting_verification' })
        .where(eq(orders.id, order.id));
    });

    // 4. Realtime → admin langsung tahu ada bukti baru
    const { publishRealtimeEvent } = await import('@/services/realtime');
    publishRealtimeEvent({
      topic: 'admin',
      type: 'order.changed',
      payload: { orderToken, paymentStatus: 'waiting_verification' },
    });

    // 5. WA arahan ke customer (best-effort)
    await notifyCustomerPaid(orderToken);

    return { ok: true };
  } catch (err) {
    console.error('[submitPaymentProofAction]', err);
    return { ok: false, error: 'Gagal mengirim bukti transfer. Coba lagi.' };
  }
}

/**
 * Kirim WA berisi arahan verifikasi ke customer (best-effort — gagal kirim
 * tidak boleh menggagalkan konfirmasi pembayaran).
 */
async function notifyCustomerPaid(orderToken: string): Promise<void> {
  try {
    const session = await getCustomerSession();
    if (!session) return;

    const { db } = await import('@/db');
    const { orders, customers } = await import('@/db/schema');
    const { and, eq } = await import('drizzle-orm');
    const [row] = await db
      .select({
        total: orders.total,
        name: customers.name,
        phone: customers.phone,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.orderToken, orderToken), eq(orders.sessionId, session.sessionId)))
      .limit(1);
    if (!row?.phone) return;

    const { notifyOrderStatus } = await import('@/services/whatsapp');
    const { paymentConfirmationMessage } = await import('@/utils');
    const to = row.phone.replace(/^(\+62|62|0)/, '62');
    const message = paymentConfirmationMessage({
      customerName: row.name,
      orderToken,
      total: Number(row.total),
    });

    // Kirim langsung via provider (notifyOrderStatus hanya untuk status order)
    const { getWhatsAppProvider } = await import('@/services/whatsapp');
    const provider = getWhatsAppProvider();
    const result = await provider.send(to, message);
    if (!result.ok) {
      console.error(`[whatsapp:${provider.name}] gagal kirim konfirmasi bayar: ${result.error}`);
    }
  } catch (err) {
    console.error('[whatsapp] gagal kirim konfirmasi bayar:', err);
  }
}
