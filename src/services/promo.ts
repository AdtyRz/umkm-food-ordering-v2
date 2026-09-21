/**
 * PromoService — validasi & kelola promo.
 */
import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { promos } from '@/db/schema';
import { calculatePromoDiscount } from '@/utils';
import type { PromoType } from '@/types';

export type PromoValidationResult =
  | { ok: true; promoId: string; code: string; name: string; discount: number }
  | { ok: false; error: string };

/** Cek kode promo terhadap subtotal (dipakai preview checkout). */
export async function validatePromoCode(
  code: string,
  subtotal: number
): Promise<PromoValidationResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: 'Masukkan kode promo.' };

  const [promo] = await db
    .select()
    .from(promos)
    .where(and(eq(promos.code, normalized), eq(promos.isActive, true)))
    .limit(1);

  if (!promo) return { ok: false, error: 'Kode promo tidak ditemukan.' };

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) {
    return { ok: false, error: 'Promo belum dimulai.' };
  }
  if (promo.endsAt && promo.endsAt < now) {
    return { ok: false, error: 'Promo sudah berakhir.' };
  }

  const discount = calculatePromoDiscount(subtotal, {
    type: promo.type as PromoType,
    value: Number(promo.value),
    minimumPurchase: Number(promo.minimumPurchase),
    maximumDiscount: promo.maximumDiscount != null ? Number(promo.maximumDiscount) : null,
  });

  if (discount == null) {
    return {
      ok: false,
      error: `Minimum pembelian ${Number(promo.minimumPurchase).toLocaleString('id-ID')} untuk promo ini.`,
    };
  }

  return {
    ok: true,
    promoId: promo.id,
    code: promo.code,
    name: promo.name,
    discount,
  };
}

// ============================================================
// ADMIN CRUD
// ============================================================
export async function getAllPromos() {
  return db.select().from(promos).orderBy(desc(promos.createdAt));
}

export async function createPromo(input: {
  name: string;
  code: string;
  type: PromoType;
  value: number;
  minimumPurchase: number;
  maximumDiscount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const code = input.code.trim().toUpperCase();
  const [existing] = await db.select({ id: promos.id }).from(promos).where(eq(promos.code, code)).limit(1);
  if (existing) return { ok: false, error: 'Kode promo sudah dipakai.' };

  const id = crypto.randomUUID();
  await db.insert(promos).values({
    id,
    name: input.name,
    code,
    type: input.type,
    value: String(input.value),
    minimumPurchase: String(input.minimumPurchase),
    maximumDiscount: input.maximumDiscount != null ? String(input.maximumDiscount) : null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  });
  return { ok: true, id };
}

export async function updatePromo(
  id: string,
  input: {
    name: string;
    type: PromoType;
    value: number;
    minimumPurchase: number;
    maximumDiscount: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
  }
) {
  await db
    .update(promos)
    .set({
      name: input.name,
      type: input.type,
      value: String(input.value),
      minimumPurchase: String(input.minimumPurchase),
      maximumDiscount: input.maximumDiscount != null ? String(input.maximumDiscount) : null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive,
    })
    .where(eq(promos.id, id));
}

export async function deletePromo(id: string) {
  await db.delete(promos).where(eq(promos.id, id));
}
