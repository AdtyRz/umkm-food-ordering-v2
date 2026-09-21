/**
 * OrderService — logika bisnis pesanan.
 * Semua perhitungan harga dilakukan SERVER-SIDE (PRD §82).
 */
import 'server-only';
import { randomInt } from 'node:crypto';
import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  customers,
  orderItems,
  orders,
  orderStatusHistories,
  payments,
  products,
  promoUsages,
  promos,
} from '@/db/schema';
import { ORDER_STATUS_TRANSITIONS } from '@/constants';
import { calculatePromoDiscount } from '@/utils';
import { getStoreOpenStatus } from './store';
import { getAdminSession } from './admin-auth';
import type { OrderStatus, OrderWithDetails, PaymentMethod } from '@/types';

// ============================================================
// TYPES
// ============================================================
export type CreateOrderInput = {
  sessionId: string;
  customerId: string;
  name: string;
  phone: string;
  note?: string | null;
  paymentMethod: PaymentMethod;
  promoCode?: string | null;
  items: { productId: string; quantity: number }[];
};

export type CreateOrderResult =
  | { ok: true; orderId: string; orderToken: string }
  | { ok: false; error: string; code: string };

// ============================================================
// TOKEN ORDER
// ============================================================
const ORDER_TOKEN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateOrderToken(): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    // randomInt memakai crypto RNG — token order tidak predictable.
    out += ORDER_TOKEN_ALPHABET[randomInt(ORDER_TOKEN_ALPHABET.length)];
  }
  return `ORD-${out}`;
}

// ============================================================
// HELPERS
// ============================================================
function mapOrderRow(row: typeof orders.$inferSelect): OrderWithDetails {
  return {
    id: row.id,
    orderToken: row.orderToken,
    customerId: row.customerId,
    customerName: null,
    customerPhone: null,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    promoCode: null,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    orderStatus: row.orderStatus,
    customerNote: row.customerNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: [],
  };
}

async function hydrateOrders(rows: (typeof orders.$inferSelect)[]): Promise<OrderWithDetails[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  // Customer info
  const { customers } = await import('@/db/schema');
  const customerRows = await db
    .select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers)
    .where(inArray(customers.id, rows.map((r) => r.customerId)));
  const customerMap = new Map(customerRows.map((c) => [c.id, c]));

  // Items
  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, ids));

  // Promo code
  const promoIds = rows.map((r) => r.promoId).filter((v): v is string => Boolean(v));
  const promoRows = promoIds.length
    ? await db.select({ id: promos.id, code: promos.code }).from(promos).where(inArray(promos.id, promoIds))
    : [];
  const promoMap = new Map(promoRows.map((p) => [p.id, p.code]));

  return rows.map((row) => {
    const order = mapOrderRow(row);
    const customer = customerMap.get(row.customerId);
    return {
      ...order,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
      promoCode: row.promoId ? promoMap.get(row.promoId) ?? null : null,
      items: itemRows
        .filter((it) => it.orderId === row.id)
        .map((it) => ({
          id: it.id,
          productName: it.productName,
          productPrice: Number(it.productPrice),
          quantity: it.quantity,
          subtotal: Number(it.subtotal),
        })),
    };
  });
}

// ============================================================
// CREATE ORDER (inti bisnis)
// ============================================================
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // 1. Toko harus buka
  const storeStatus = await getStoreOpenStatus();
  if (!storeStatus) {
    return { ok: false, code: 'STORE_NOT_CONFIGURED', error: 'Pengaturan toko belum tersedia.' };
  }
  if (!storeStatus.isOpen) {
    return {
      ok: false,
      code: 'STORE_CLOSED',
      error: 'Toko sedang tutup. Pesanan baru belum dapat dibuat.',
    };
  }

  if (input.items.length === 0) {
    return { ok: false, code: 'EMPTY_CART', error: 'Keranjang kosong.' };
  }

  // 2. Ambil produk dari DB (jangan percaya harga client)
  const productIds = input.items.map((i) => i.productId);
  const productRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));

  if (productRows.length !== productIds.length) {
    return { ok: false, code: 'PRODUCT_NOT_FOUND', error: 'Ada produk yang tidak ditemukan. Muat ulang halaman.' };
  }

  // 3. Validasi availability per item
  for (const item of input.items) {
    const product = productRows.find((p) => p.id === item.productId);
    if (!product) continue;
    if (product.stockStatus === 'out' || !product.isAvailable) {
      return {
        ok: false,
        code: 'PRODUCT_UNAVAILABLE',
        error: `Produk baru saja habis: ${product.name}. Silakan periksa keranjangmu.`,
      };
    }
  }

  // 4. Hitung subtotal dari harga DB
  let subtotal = 0;
  const lineItems = input.items.map((item) => {
    const product = productRows.find((p) => p.id === item.productId)!;
    const price = Number(product.price);
    const lineTotal = price * item.quantity;
    subtotal += lineTotal;
    return {
      productId: product.id,
      productName: product.name,
      productPrice: price,
      quantity: item.quantity,
      subtotal: lineTotal,
    };
  });

  // 5. Promo (server-side)
  let discount = 0;
  let promoId: string | null = null;
  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase();
    const [promo] = await db
      .select()
      .from(promos)
      .where(and(eq(promos.code, code), eq(promos.isActive, true)))
      .limit(1);

    const now = new Date();
    const validWindow =
      promo && (!promo.startsAt || promo.startsAt <= now) && (!promo.endsAt || promo.endsAt >= now);

    if (!promo || !validWindow) {
      return { ok: false, code: 'PROMO_INVALID', error: 'Kode promo tidak valid atau sudah berakhir.' };
    }

    const promoDiscount = calculatePromoDiscount(subtotal, {
      type: promo.type,
      value: Number(promo.value),
      minimumPurchase: Number(promo.minimumPurchase),
      maximumDiscount: promo.maximumDiscount != null ? Number(promo.maximumDiscount) : null,
    });

    if (promoDiscount == null) {
      return {
        ok: false,
        code: 'PROMO_MIN_NOT_MET',
        error: `Minimum pembelian promo ${promo.code} adalah ${Number(promo.minimumPurchase).toLocaleString('id-ID')}.`,
      };
    }

    discount = promoDiscount;
    promoId = promo.id;
  }

  const total = subtotal - discount;

  // 6. Toko tutup → tolak (double check); order token unik
  const orderToken = await (async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateOrderToken();
      const [existing] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.orderToken, candidate))
        .limit(1);
      if (!existing) return candidate;
    }
    throw new Error('Gagal generate order token');
  })();

  // 7. Simpan order + items + payment + history dalam SATU transaksi
  const orderId = crypto.randomUUID();
  const paymentStatus = 'pending' as const;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      id: orderId,
      orderToken,
      customerId: input.customerId,
      sessionId: input.sessionId,
      subtotal: String(subtotal),
      discount: String(discount),
      total: String(total),
      promoId,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      orderStatus: 'pending',
      customerNote: input.note || null,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(orderItems).values(
      lineItems.map((li) => ({
        orderId,
        productId: li.productId,
        productName: li.productName,
        productPrice: String(li.productPrice),
        quantity: li.quantity,
        subtotal: String(li.subtotal),
      }))
    );

    await tx.insert(payments).values({
      orderId,
      method: input.paymentMethod,
      status: input.paymentMethod === 'qris' ? 'pending' : 'pending',
      // COD: lunas saat diterima (admin konfirmasi saat selesai)
      // QRIS: menunggu verifikasi manual admin
    });

    await tx.insert(orderStatusHistories).values({
      orderId,
      status: 'pending',
      note: 'Pesanan dibuat',
      changedBy: 'customer',
    });

    // Simpan data customer (dipakai untuk notifikasi & tampilan admin)
    await tx
      .update(customers)
      .set({ name: input.name, phone: input.phone })
      .where(eq(customers.id, input.customerId));

    if (promoId) {
      await tx.insert(promoUsages).values({
        promoId,
        orderId,
        discountAmount: String(discount),
      });
    }
  });

  // 8. Realtime ke admin: order baru!
  const { publishRealtimeEvent } = await import('./realtime');
  publishRealtimeEvent({
    topic: 'admin',
    type: 'order.new',
    payload: { orderToken, orderId, total, customerName: input.name },
  });
  publishRealtimeEvent({
    topic: `order:${input.sessionId}`,
    type: 'order.created',
    payload: { orderToken, orderStatus: 'pending', paymentStatus },
  });

  // 9. WhatsApp notification (best-effort, jangan blokir order)
  try {
    const { notifyOrderStatus } = await import('./whatsapp');
    await notifyOrderStatus({
      orderToken,
      status: 'pending',
      customerName: input.name,
      phone: input.phone,
      total,
    });
  } catch (err) {
    console.error('[whatsapp] gagal kirim notifikasi:', err);
  }

  return { ok: true, orderId, orderToken };
}

// ============================================================
// STATUS TRANSITIONS (admin)
// ============================================================
export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  opts?: { note?: string; actor?: string }
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: 'UNAUTHORIZED' };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, error: 'Order tidak ditemukan' };

  const allowed = ORDER_STATUS_TRANSITIONS[order.orderStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      ok: false,
      error: `Perubahan status dari "${order.orderStatus}" ke "${nextStatus}" tidak diizinkan.`,
    };
  }

  await db.transaction(async (tx) => {
    await tx.update(orders).set({ orderStatus: nextStatus }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistories).values({
      orderId,
      status: nextStatus,
      note: opts?.note ?? null,
      changedBy: opts?.actor ?? admin.name,
    });
    // COD otomatis lunas saat pesanan selesai
    if (nextStatus === 'completed' && order.paymentMethod === 'cod') {
      await tx
        .update(payments)
        .set({ status: 'paid', verifiedBy: admin.name, verifiedAt: new Date() })
        .where(eq(payments.orderId, orderId));
      await tx.update(orders).set({ paymentStatus: 'paid' }).where(eq(orders.id, orderId));
    }
  });

  // Realtime ke customer milik order ini + admin lain
  const { publishRealtimeEvent } = await import('./realtime');
  if (order.sessionId) {
    publishRealtimeEvent({
      topic: `order:${order.sessionId}`,
      type: 'order.status_changed',
      payload: { orderToken: order.orderToken, orderStatus: nextStatus, paymentStatus: order.paymentStatus },
    });

    // Pesanan selesai → session customer hangus: token di-revoke,
    // cookie dibersihkan, dan customer diminta membuat token baru.
    // Revoke hanya bila tidak ada pesanan aktif lain pada session ini.
    if (nextStatus === 'completed') {
      const { revokeCustomerSession } = await import('./customer-session');
      const [active] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.sessionId, order.sessionId),
            inArray(orders.orderStatus, [
              'pending',
              'approved',
              'processing',
              'ready',
              'delivering',
            ])
          )
        )
        .limit(1);
      if (!active) {
        await revokeCustomerSession(order.sessionId);
      }
    }
  }
  publishRealtimeEvent({
    topic: 'admin',
    type: 'order.changed',
    payload: { orderToken: order.orderToken, orderStatus: nextStatus },
  });

  // WhatsApp notification (best-effort)
  try {
    const { customers } = await import('@/db/schema');
    const [customer] = await db
      .select({ name: customers.name, phone: customers.phone })
      .from(customers)
      .where(eq(customers.id, order.customerId))
      .limit(1);
    const { notifyOrderStatus } = await import('./whatsapp');
    await notifyOrderStatus({
      orderToken: order.orderToken,
      status: nextStatus,
      customerName: customer?.name ?? null,
      phone: customer?.phone ?? null,
      total: Number(order.total),
    });
  } catch (err) {
    console.error('[whatsapp] gagal kirim notifikasi:', err);
  }

  return { ok: true };
}

export async function updatePaymentStatus(
  orderId: string,
  status: 'pending' | 'waiting_verification' | 'paid' | 'failed',
  reference?: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: 'UNAUTHORIZED' };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { ok: false, error: 'Order tidak ditemukan' };

  await db.transaction(async (tx) => {
    await tx.update(payments).set({ status, reference: reference ?? null }).where(eq(payments.orderId, orderId));
    await tx.update(orders).set({ paymentStatus: status }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistories).values({
      orderId,
      status: order.orderStatus,
      note: `Pembayaran: ${status}`,
      changedBy: admin.name,
    });
  });

  const { publishRealtimeEvent } = await import('./realtime');
  if (order.sessionId) {
    publishRealtimeEvent({
      topic: `order:${order.sessionId}`,
      type: 'order.updated',
      payload: { orderToken: order.orderToken, orderStatus: order.orderStatus, paymentStatus: status },
    });
  }

  return { ok: true };
}

// ============================================================
// QUERIES
// ============================================================
/** Semua order (admin) dengan filter status opsional. */
export async function getOrdersForAdmin(statusFilter?: OrderStatus) {
  const base = db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(200);
  const rows = statusFilter
    ? await db.select().from(orders).where(eq(orders.orderStatus, statusFilter)).orderBy(desc(orders.createdAt)).limit(200)
    : await base;
  return hydrateOrders(rows);
}

/** Order milik satu customer session (customer hanya melihat ini). */
export async function getOrdersBySession(sessionId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.sessionId, sessionId))
    .orderBy(desc(orders.createdAt))
    .limit(50);
  return hydrateOrders(rows);
}

/** Detail order untuk customer — WAJIB cocok session (Rule 14). */
export async function getOrderByTokenForSession(
  orderToken: string,
  sessionId: string
): Promise<OrderWithDetails | null> {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderToken, orderToken), eq(orders.sessionId, sessionId)))
    .limit(1);
  if (!row) return null;

  const [hydrated] = await hydrateOrders([row]);

  // Histories + payment
  const histories = await db
    .select()
    .from(orderStatusHistories)
    .where(eq(orderStatusHistories.orderId, row.id))
    .orderBy(asc(orderStatusHistories.createdAt));
  const [payment] = await db.select().from(payments).where(eq(payments.orderId, row.id)).limit(1);

  return {
    ...hydrated,
    histories: histories.map((h) => ({
      id: h.id,
      status: h.status,
      note: h.note,
      changedBy: h.changedBy,
      createdAt: h.createdAt.toISOString(),
    })),
    payment: payment
      ? {
          method: payment.method,
          status: payment.status,
          reference: payment.reference,
          proofPath: payment.proofPath,
          verifiedAt: payment.verifiedAt ? payment.verifiedAt.toISOString() : null,
        }
      : null,
  };
}

/** Detail order untuk admin (tanpa batasan session). */
export async function getOrderByIdForAdmin(orderId: string): Promise<OrderWithDetails | null> {
  const admin = await getAdminSession();
  if (!admin) return null;

  const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!row) return null;

  const [hydrated] = await hydrateOrders([row]);
  const histories = await db
    .select()
    .from(orderStatusHistories)
    .where(eq(orderStatusHistories.orderId, row.id))
    .orderBy(asc(orderStatusHistories.createdAt));

  return {
    ...hydrated,
    histories: histories.map((h) => ({
      id: h.id,
      status: h.status,
      note: h.note,
      changedBy: h.changedBy,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

/** Pesanan aktif terakhir dari session (untuk banner tracking). */
export async function getActiveOrderBySession(sessionId: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.sessionId, sessionId),
        inArray(orders.orderStatus, ['pending', 'approved', 'processing', 'ready', 'delivering'])
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return rows[0] ? (await hydrateOrders(rows))[0] : null;
}

/** Order hari ini (admin dashboard). */
export async function getTodayOrders() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const rows = await db
    .select()
    .from(orders)
    .where(gte(orders.createdAt, startOfDay))
    .orderBy(desc(orders.createdAt));
  return hydrateOrders(rows);
}
