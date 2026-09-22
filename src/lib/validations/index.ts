import { z } from 'zod';

// ============================================================
// CHECKOUT CUSTOMER
// ============================================================
export const checkoutSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(60, 'Nama maksimal 60 karakter'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,13}$/, 'Nomor HP Indonesia tidak valid (contoh: 081234567890)'),
  note: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional().or(z.literal('')),
  paymentMethod: z.enum(['qris', 'cod']),
  promoCode: z.string().trim().max(40).optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'Keranjang kosong')
    .max(30, 'Terlalu banyak item'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ============================================================
// ADMIN LOGIN
// ============================================================
export const adminLoginSchema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// ============================================================
// ADMIN ACCOUNT SETTINGS
// ============================================================
export const adminProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(120, 'Nama maksimal 120 karakter'),
  email: z.string().trim().email('Email tidak valid'),
});

export type AdminProfileInput = z.infer<typeof adminProfileSchema>;

export const adminPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Password baru minimal 8 karakter')
      .max(72, 'Password maksimal 72 karakter')
      .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Password baru harus berbeda dari password lama',
    path: ['newPassword'],
  });

export type AdminPasswordInput = z.infer<typeof adminPasswordSchema>;

// ============================================================
// PRODUK
// ============================================================
export const productSchema = z.object({
  name: z.string().trim().min(2, 'Nama produk minimal 2 karakter').max(150),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'Harga tidak boleh negatif').max(999999999),
  categoryId: z.string().uuid().nullable().optional(),
  stockStatus: z.enum(['many', 'low', 'out']),
  isAvailable: z.boolean().default(true),
  imagePath: z.string().max(500).nullable().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ============================================================
// KATEGORI
// ============================================================
export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter').max(80),
  description: z.string().trim().max(255).optional().or(z.literal('')),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ============================================================
// PROMO
// ============================================================
export const promoSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama promo minimal 2 karakter').max(120),
    code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{4,20}$/, 'Kode 4-20 karakter, huruf besar/angka (contoh: HEMAT10)'),
    type: z.enum(['percentage', 'fixed_amount']),
    value: z.coerce.number().positive('Nilai harus lebih dari 0'),
    minimumPurchase: z.coerce.number().min(0).default(0),
    maximumDiscount: z.coerce.number().positive().nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) =>
      data.type !== 'percentage' ||
      data.value <= 100 ||
      data.maximumDiscount != null,
    {
      message:
        'Promo percentage >100% wajib punya maksimum diskon (atau turunkan nilai persentase)',
      path: ['value'],
    }
  );

export type PromoInput = z.infer<typeof promoSchema>;

// ============================================================
// STORE SETTINGS
// ============================================================
export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2, 'Nama toko minimal 2 karakter').max(120),
  logoPath: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  whatsapp: z.string().trim().max(32).optional().or(z.literal('')),
  email: z.string().trim().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  timezone: z.string().trim().max(64).default('Asia/Jakarta'),
  developerName: z.string().trim().max(120).optional().or(z.literal('')),
  developerInfo: z.string().trim().max(255).optional().or(z.literal('')),
  developerContact: z.string().trim().max(255).optional().or(z.literal('')),
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const operatingHoursSchema = z.object({
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format jam: HH:MM'),
      closeTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format jam: HH:MM'),
      isClosed: z.boolean(),
    })
  ).length(7, 'Wajib 7 hari'),
});

export const storeStatusModeSchema = z.object({
  mode: z.enum(['automatic', 'force_open', 'force_closed']),
  manualStatus: z.boolean().default(false),
});

export const paymentSettingsSchema = z.object({
  qrisReceiverName: z.string().trim().max(120).optional().or(z.literal('')),
  qrisImagePath: z.string().trim().max(500).nullable().optional(),
  codEnabled: z.boolean().default(true),
});

export const waBotSettingsSchema = z.object({
  /** Nomor perangkat bot, format +62 / 62 / 08 — dinormalisasi ke 62. */
  waBotNumber: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,13}$/, 'Nomor bot tidak valid (contoh: 081234567890)')
    .nullable()
    .optional()
    .or(z.literal('')),
  waBotEnabled: z.boolean().default(false),
}).refine((d) => !d.waBotEnabled || (d.waBotNumber && d.waBotNumber.length > 0), {
  message: 'Isi nomor bot dulu sebelum mengaktifkan bot',
  path: ['waBotNumber'],
});

export const sendNotificationSchema = z.object({
  orderId: z.string().uuid(),
  /** Pesan khusus dari admin (opsional — dipakai bila ada). */
  message: z.string().trim().max(1000).optional(),
});

// ============================================================
// ADMIN ORDER/PAYMENT STATUS UPDATE
// ============================================================
export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    'pending',
    'approved',
    'processing',
    'ready',
    'delivering',
    'completed',
    'rejected',
    'cancelled',
  ]),
  note: z.string().trim().max(500).optional(),
});

export const updatePaymentStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'waiting_verification', 'paid', 'failed']),
  reference: z.string().trim().max(255).optional(),
});
