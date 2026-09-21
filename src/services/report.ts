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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  weekAgo.setHours(0, 0, 0, 0);

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
          date: sql<string>`DATE_FORMAT(created_at, '%Y-%m-%d')`,
          revenue: sql<number>`COALESCE(SUM(total), 0)`,
          orders: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(gte(orders.createdAt, weekAgo), validStatusSql))
        .groupBy(sql`DATE_FORMAT(created_at, '%Y-%m-%d')`)
        .orderBy(sql`DATE_FORMAT(created_at, '%Y-%m-%d')`),
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

const PERIOD_FORMAT: Record<ReportPeriod, string> = {
  daily: "DATE_FORMAT(created_at, '%Y-%m-%d')",
  weekly: "DATE_FORMAT(created_at, '%x-W%v')", // ISO year-week
  monthly: "DATE_FORMAT(created_at, '%Y-%m')",
  yearly: "DATE_FORMAT(created_at, '%Y')",
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
      period: sql<string>`${sql.raw(fmt)}`,
      totalOrders: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(total), 0)`,
      discount: sql<number>`COALESCE(SUM(discount), 0)`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(sql`${sql.raw(fmt)}`)
    .orderBy(sql`${sql.raw(fmt)}`);

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
