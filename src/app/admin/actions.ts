'use server';

/**
 * Server actions khusus admin. Semua action memanggil requireAdmin()
 * terlebih dahulu — jangan pernah percaya request client (PRD §81).
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  loginAdmin,
  logoutAdmin,
  requireAdmin,
  updateAdminProfile,
  changeAdminPassword,
  type AdminIdentity,
} from '@/services/admin-auth';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  setProductAvailability,
} from '@/services/catalog';
import { createPromo, updatePromo, deletePromo } from '@/services/promo';
import {
  updateOrderStatus,
  updatePaymentStatus,
} from '@/services/order';
import {
  updateStoreSettings,
  updateOperatingHours,
  setStoreStatusMode,
} from '@/services/store';
import {
  productSchema,
  categorySchema,
  promoSchema,
  storeSettingsSchema,
  operatingHoursSchema,
  storeStatusModeSchema,
  adminLoginSchema,
  adminProfileSchema,
  adminPasswordSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from '@/lib/validations';
import type { PromoType, StockStatus } from '@/types';

type ActionResult = { ok: boolean; error?: string };

// ============================================================
// AUTH
// ============================================================
export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = adminLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
  }
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      'local';
    await loginAdmin(parsed.data, {
      rateLimitKey: `${parsed.data.email.toLowerCase()}|${ip}`,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Login gagal' };
  }
}

export async function logoutAction(): Promise<void> {
  await logoutAdmin();
  revalidatePath('/admin', 'layout');
}

// ============================================================
// PENGATURAN AKUN ADMIN
// ============================================================
export async function updateAdminProfileAction(input: {
  name: string;
  email: string;
}): Promise<ActionResult> {
  const parsed = adminProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
  }
  try {
    const admin = await requireAdmin();
    return await updateAdminProfile(admin, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sesi berakhir. Silakan login ulang.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal menyimpan profil' };
  }
}

export async function changeAdminPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = adminPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
  }
  try {
    const admin = await requireAdmin();
    return await changeAdminPassword(admin, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sesi berakhir. Silakan login ulang.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal mengganti password' };
  }
}

// ============================================================
// PRODUK
// ============================================================
export async function saveProductAction(input: {
  id?: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  stockStatus: StockStatus;
  isAvailable: boolean;
  imagePath: string | null;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const data = parsed.data;

    if (input.id) {
      await updateProduct(input.id, {
        name: data.name,
        description: data.description || null,
        price: data.price,
        categoryId: data.categoryId ?? null,
        stockStatus: data.stockStatus,
        isAvailable: data.isAvailable,
        imagePath: data.imagePath ?? null,
      });
    } else {
      await createProduct({
        name: data.name,
        description: data.description || null,
        price: data.price,
        categoryId: data.categoryId ?? null,
        stockStatus: data.stockStatus,
        isAvailable: data.isAvailable,
        imagePath: data.imagePath ?? null,
      });
    }

    revalidatePath('/admin/products');
    revalidatePath('/menu');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    console.error('[saveProductAction]', err);
    return { ok: false, error: 'Gagal menyimpan produk.' };
  }
}

export async function setProductAvailabilityAction(
  id: string,
  stockStatus: StockStatus,
  isAvailable: boolean
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await setProductAvailability(id, stockStatus, isAvailable);
    revalidatePath('/admin/products');
    revalidatePath('/menu');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah ketersediaan.' };
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await deleteProduct(id);
    revalidatePath('/admin/products');
    revalidatePath('/menu');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus produk.' };
  }
}

// ============================================================
// KATEGORI
// ============================================================
export async function saveCategoryAction(input: {
  id?: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const data = parsed.data;

    if (input.id) {
      await updateCategory(input.id, {
        name: data.name,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      });
    } else {
      await createCategory({
        name: data.name,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      });
    }

    revalidatePath('/admin/categories');
    revalidatePath('/menu');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    return { ok: false, error: 'Gagal menyimpan kategori.' };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await deleteCategory(id);
    revalidatePath('/admin/categories');
    revalidatePath('/menu');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus kategori.' };
  }
}

// ============================================================
// ORDER & PAYMENT STATUS
// ============================================================
export async function updateOrderStatusAction(input: {
  orderId: string;
  status: z.infer<typeof updateOrderStatusSchema>['status'];
  note?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = updateOrderStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const result = await updateOrderStatus(parsed.data.orderId, parsed.data.status, {
      note: parsed.data.note,
    });
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${input.orderId}`);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah status pesanan.' };
  }
}

export async function updatePaymentStatusAction(input: {
  orderId: string;
  status: z.infer<typeof updatePaymentStatusSchema>['status'];
  reference?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = updatePaymentStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const result = await updatePaymentStatus(parsed.data.orderId, parsed.data.status, parsed.data.reference);
    revalidatePath('/admin/orders');
    revalidatePath(`/admin/orders/${input.orderId}`);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah status pembayaran.' };
  }
}

// ============================================================
// PROMO
// ============================================================
export async function savePromoAction(input: {
  id?: string;
  name: string;
  code: string;
  type: PromoType;
  value: number;
  minimumPurchase: number;
  maximumDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = promoSchema.safeParse({
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt).toISOString() : null,
      endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const data = parsed.data;

    const values = {
      name: data.name,
      type: data.type,
      value: data.value,
      minimumPurchase: data.minimumPurchase,
      maximumDiscount: data.maximumDiscount ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive,
    };

    if (input.id) {
      await updatePromo(input.id, values);
    } else {
      const result = await createPromo({ ...values, code: data.code });
      if (!result.ok) return { ok: false, error: result.error };
    }

    revalidatePath('/admin/promos');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    return { ok: false, error: 'Gagal menyimpan promo.' };
  }
}

export async function deletePromoAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await deletePromo(id);
    revalidatePath('/admin/promos');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghapus promo.' };
  }
}

// ============================================================
// STORE SETTINGS
// ============================================================
export async function saveStoreSettingsAction(input: {
  storeName: string;
  logoPath: string | null;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  developerName: string;
  developerInfo: string;
  developerContact: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = storeSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const d = parsed.data;
    await updateStoreSettings({
      storeName: d.storeName,
      logoPath: d.logoPath || null,
      description: d.description || null,
      phone: d.phone || null,
      whatsapp: d.whatsapp?.replace(/^(\+62|62|0)/, '62').replace(/\D/g, '') || null,
      email: d.email || null,
      address: d.address || null,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      timezone: d.timezone,
      developerName: d.developerName || null,
      developerInfo: d.developerInfo || null,
      developerContact: d.developerContact || null,
    });
    revalidatePath('/admin/store');
    revalidatePath('/menu');
    revalidatePath('/settings');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    return { ok: false, error: 'Gagal menyimpan pengaturan toko.' };
  }
}

export async function saveOperatingHoursAction(input: {
  hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[];
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = operatingHoursSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    await updateOperatingHours(parsed.data.hours);
    revalidatePath('/admin/hours');
    revalidatePath('/settings');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menyimpan jam operasional.' };
  }
}/**
 * Teks pengumuman & payload WA siap-posting. Data diambil ulang dari DB
 * saat tombol ditekan, jadi caption tidak pernah basi.
 */
export async function getAnnouncementAction(): Promise<
  | { ok: true; caption: string; broadcast: string }
  | { ok: false; error: string }
> {
  try {
    await requireAdmin();
    const [
      { getStoreInfo, getOperatingHours, getStoreOpenStatus },
      { getAvailableProducts },
      { buildAnnouncementText, buildBroadcastText },
    ] = await Promise.all([
      import('@/services/store'),
      import('@/services/catalog'),
      import('@/utils'),
    ]);

    const [store, openStatus, products] = await Promise.all([
      getStoreInfo(),
      getStoreOpenStatus(),
      getAvailableProducts(),
    ]);
    if (!store || !openStatus) {
      return { ok: false, error: 'Pengaturan toko belum ada.' };
    }

    // Caption buka/tutup (fitur #1)
    const caption = buildAnnouncementText({
      storeName: store.storeName,
      isOpen: openStatus.isOpen,
      todayHours: openStatus.todayHours,
    });

    // Payload WA: hanya produk yang pasti bisa dipesan sekarang
    const orderable = products
      .filter((p) => p.isAvailable && p.stockStatus !== 'out')
      .map((p) => ({ name: p.name, price: p.price }));
    const broadcast = buildBroadcastText(store.storeName, openStatus.isOpen, orderable);

    return { ok: true, caption, broadcast };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    return { ok: false, error: 'Gagal membuat pengumuman.' };
  }
}

export async function setStoreStatusModeAction(input: {
  mode: 'automatic' | 'force_open' | 'force_closed';
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = storeStatusModeSchema.safeParse({ ...input, manualStatus: input.mode !== 'automatic' });
    if (!parsed.success) {
      return { ok: false, error: 'Mode tidak valid' };
    }
    await setStoreStatusMode(parsed.data.mode, parsed.data.manualStatus);
    revalidatePath('/admin/store');
    revalidatePath('/menu');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal mengubah status toko.' };
  }
}

export async function savePaymentSettingsAction(input: {
  qrisReceiverName: string;
  qrisImagePath: string | null;
  codEnabled: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { paymentSettingsSchema } = await import('@/lib/validations');
    const parsed = paymentSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const { db } = await import('@/db');
    const { storeSettings } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    await db
      .update(storeSettings)
      .set({
        qrisReceiverName: parsed.data.qrisReceiverName || null,
        qrisImagePath: parsed.data.qrisImagePath || null,
        codEnabled: parsed.data.codEnabled,
      })
      .where(eq(storeSettings.id, 1));
    revalidatePath('/admin/store');
    revalidatePath('/checkout');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    return { ok: false, error: 'Gagal menyimpan pengaturan pembayaran.' };
  }
}

// ============================================================
// BOT WHATSAPP (nomor perangkat + saklar aktif)
// ============================================================
export async function saveWhatsAppBotSettingsAction(input: {
  waBotNumber: string;
  waBotEnabled: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { waBotSettingsSchema } = await import('@/lib/validations');
    const parsed = waBotSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }
    const d = parsed.data;
    const { db } = await import('@/db');
    const { storeSettings } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    await db
      .update(storeSettings)
      .set({
        // Normalisasi ke format internasional tanpa '+' (62xxx)
        waBotNumber: d.waBotNumber
          ? d.waBotNumber.replace(/^(\+62|62|0)/, '62').replace(/\D/g, '')
          : null,
        waBotEnabled: d.waBotEnabled,
      })
      .where(eq(storeSettings.id, 1));
    revalidatePath('/admin/store');
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    return { ok: false, error: 'Gagal menyimpan pengaturan bot WA.' };
  }
}

// ============================================================
// UPLOAD GAMBAR (produk / logo / QRIS)
// ============================================================
const uploadSchema = z.object({
  file: z.instanceof(File),
  folder: z.enum(['products', 'store', 'qris']),
});

export async function uploadImageAction(formData: FormData): Promise<
  { ok: true; path: string } | { ok: false; error: string }
> {
  try {
    await requireAdmin();

    const parsed = uploadSchema.safeParse({
      file: formData.get('file'),
      folder: formData.get('folder'),
    });
    if (!parsed.success) return { ok: false, error: 'Upload tidak valid.' };

    const { file, folder } = parsed.data;

    // Validasi MIME & ukuran (PRD §84)
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      return { ok: false, error: 'Format harus JPG/PNG/WebP.' };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: 'Ukuran maksimal 2MB.' };
    }

    const { saveUploadedImage } = await import('@/lib/storage');
    const path = await saveUploadedImage(file, folder);
    return { ok: true, path };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    console.error('[uploadImageAction]', err);
    return { ok: false, error: 'Gagal mengupload gambar.' };
  }
}
