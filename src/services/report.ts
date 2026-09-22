/**
 * ReportService — statistik penjualan & laporan pendapatan.
 * Semua agregasi dilakukan di SQL (hemat memori & cepat).
 */
import 'server-only';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { orderItems, orders, products } from '@/db/schema';
import type { OrderStatus } from '@/types';

/** Status yang dihitung sebagai transaksi sah. */
const VALID_STATUSES: OrderStatus[] = [
  'approved',
  'processing',
  'ready',
  'delivering',
  'completed',
];
const REVENUE_STATUSES_SQL = sql`('approved','processing','ready','delivering','completed')`;

/**
 * Timezone toko — dipakai untuk membagi penjualan per hari.
 * Server produksi (Vercel) berjalan di UTC, jadi batas "hari ini"
 * HARUS dihitung eksplisit di zona ini, bukan dari jam server.
 */
const STORE_TZ = 'Asia/Jakarta'; // UTC+7 (WIB)

/** Tanggal & jam "sekarang" di timezone toko (parts per komponen). */
function zonedParts(date: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Awal hari (00:00 WIB) hari ini, sebagai Date absolut. */
function startOfTodayInStoreTZ(): Date {
  const { year, month, day } = zonedParts(new Date());
  // Tengah malam WIB = 17:00 UTC hari sebelumnya (WIB = UTC+7).
  return new Date(Date.UTC(year, month - 1, day) - 7 * 3600 * 1000);
}

/** Ekspresi SQL: created_at diformat sebagai teks di timezone toko.
 *
 *  PENTING: format to_char wajib jadi LITERAL SQL (sql.raw), bukan
 *  parameter ($1). Postgres mencocokkan ekspresi GROUP BY/ORDER BY
 *  secara struktural — to_char(x, $1) di SELECT vs to_char(x, $3) di
 *  GROUP BY dianggap ekspresi BERBEDA → error "must appear in the
 *  GROUP BY clause". Nilai fmt hanya dari konstanta internal
 *  (PERIOD_FORMAT / 'YYYY-MM-DD'), bukan input user → aman.
 */
function dateInStoreTZ(pgFormat: string) {
  const fmtLiteral = sql.raw(`'${pgFormat.replace(/'/g, "''")}'`);
  return sql<string>`to_char(${orders.createdAt} AT TIME ZONE ${sql.raw(`'${STORE_TZ}'`)}, ${fmtLiteral})`;
}

export type DashboardStats = {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  outOfStockCount: number;
  activeProductCount: number;
  revenueByDay: { date: string; revenue: number; orders: number }[];
};

/** Statistik untuk kartu dashboard admin. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const startOfToday = startOfTodayInStoreTZ();
  const weekAgo = new Date(startOfToday.getTime() - 6 * 24 * 3600 * 1000);

  const validStatusSql = sql`order_status IN ${REVENUE_STATUSES_SQL}`;

  const [[todayRow], [pendingRow], [processingRow], [outStock], [activeProducts], revenueRows] =
    await Promise.all([
      db
        .select({
          count: sql<number>`COUNT(*)`,
          revenue: sql<number>`COALESCE(SUM(total), 0)`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, startOfToday), validStatusSql)),
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.orderStatus, 'pending')),
      db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.orderStatus, 'processing')),
      db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.stockStatus, 'out')),
      db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.isAvailable, true)),
      db
        .select({
          date: dateInStoreTZ('YYYY-MM-DD'),
          revenue: sql<number>`COALESCE(SUM(total), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, weekAgo), validStatusSql))
        .groupBy(dateInStoreTZ('YYYY-MM-DD'))
        .orderBy(dateInStoreTZ('YYYY-MM-DD')),
    ]);

  return {
    todayOrders: Number(todayRow?.count ?? 0),
    todayRevenue: Number(todayRow?.revenue ?? 0),
    pendingOrders: Number(pendingRow?.count ?? 0),
    processingOrders: Number(processingRow?.count ?? 0),
    outOfStockCount: Number(outStock?.count ?? 0),
    activeProductCount: Number(activeProducts?.count ?? 0),
    revenueByDay: revenueRows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
    })),
  };
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Format PostgreSQL to_char (bukan DATE_FORMAT MySQL).
// weekly: IYYY = ISO year, IW = ISO week → hasil '2026-W38'.
const PERIOD_FORMAT: Record<ReportPeriod, string> = {
  daily: 'YYYY-MM-DD',
  weekly: 'IYYY-"W"IW',
  monthly: 'YYYY-MM',
  yearly: 'YYYY',
};

export type ReportRow = {
  period: string;
  totalOrders: number;
  revenue: number;
  discount: number;
};

/** Laporan pendapatan per periode. */
export async function getRevenueReport(
  period: ReportPeriod,
  from?: Date,
  to?: Date
): Promise<ReportRow[]> {
  const fmt = PERIOD_FORMAT[period];
  const conditions = [sql`order_status IN ${REVENUE_STATUSES_SQL}`];
  if (from) conditions.push(gte(orders.createdAt, from));
  if (to) conditions.push(lte(orders.createdAt, to));

  const rows = await db
    .select({
      period: dateInStoreTZ(fmt),
      totalOrders: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(total), 0)`,
      discount: sql<number>`COALESCE(SUM(discount), 0)`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(dateInStoreTZ(fmt))
    .orderBy(dateInStoreTZ(fmt));

  return rows.map((r) => ({
    period: r.period,
    totalOrders: Number(r.totalOrders),
    revenue: Number(r.revenue),
    discount: Number(r.discount),
  }));
}

/** Produk terlaris berdasarkan quantity terjual. */
export async function getBestSellers(limit = 10, from?: Date, to?: Date) {
  const conditions = [sql`order_status IN ${REVENUE_STATUSES_SQL}`];
  if (from) conditions.push(gte(orders.createdAt, from));
  if (to) conditions.push(lte(orders.createdAt, to));

  const rows = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.productName,
      qty: sql<number>`SUM(${orderItems.quantity})`,
      revenue: sql<number>`SUM(${orderItems.subtotal})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(...conditions))
    .groupBy(orderItems.productId, orderItems.productName)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    quantity: Number(r.qty),
    revenue: Number(r.revenue),
  }));
}

/** Ringkasan analitik untuk dashboard. */
export async function getAnalyticsSummary(from?: Date, to?: Date) {
  const conditions = [sql`order_status IN ${REVENUE_STATUSES_SQL}`];
  if (from) conditions.push(gte(orders.createdAt, from));
  if (to) conditions.push(lte(orders.createdAt, to));

  const [[totals], [discountRow]] = await Promise.all([
    db
      .select({
        totalOrders: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(total), 0)`,
      })
      .from(orders)
      .where(and(...conditions)),
    db
      .select({ discount: sql<number>`COALESCE(SUM(discount), 0)` })
      .from(orders)
      .where(and(...conditions)),
  ]);

  const totalOrders = Number(totals?.totalOrders ?? 0);
  const revenue = Number(totals?.revenue ?? 0);

  return {
    totalOrders,
    revenue,
    totalDiscount: Number(discountRow?.discount ?? 0),
    averageOrderValue: totalOrders > 0 ? Math.round(revenue / totalOrders) : 0,
  };
}
