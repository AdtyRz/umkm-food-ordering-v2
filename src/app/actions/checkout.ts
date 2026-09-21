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

/**
 * Buat order dari keranjang customer.
 * Seluruh validasi (session, produk, stok, promo, harga, status toko)
 * dilakukan di server — data dari browser tidak dipercaya.
 */
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
