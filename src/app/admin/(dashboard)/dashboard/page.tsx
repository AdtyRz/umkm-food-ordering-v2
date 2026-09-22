import Link from 'next/link';
import { ArrowUpRight, ClipboardList, Package, Wallet, XCircle } from 'lucide-react';
import { getDashboardStats } from '@/services/report';
import { getOrdersForAdmin } from '@/services/order';
import { getBestSellers } from '@/services/report';
import { Card } from '@/components/ui';
import { OrderStatusBadge } from '@/components/domain/order-status-badge';
import { DashboardChart } from './chart';
import { formatRupiah } from '@/utils';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [stats, recentOrders, bestSellers] = await Promise.all([
    getDashboardStats(),
    getOrdersForAdmin(),
    getBestSellers(5),
  ]);

  const pendingOrders = recentOrders.filter((o) => o.orderStatus === 'pending').slice(0, 5);

  const cards = [
    {
      label: 'Pendapatan Hari Ini',
      value: formatRupiah(stats.todayRevenue),
      icon: Wallet,
      accent: 'bg-success-soft text-success',
    },
    {
      label: 'Pesanan Hari Ini',
      value: String(stats.todayOrders),
      icon: ClipboardList,
      accent: 'bg-primary-soft text-primary',
    },
    {
      label: 'Menunggu Persetujuan',
      value: String(stats.pendingOrders),
      icon: XCircle,
      accent: 'bg-warning-soft text-warning',
    },
    {
      label: 'Produk Aktif',
      value: `${stats.activeProductCount}`,
      icon: Package,
      accent: 'bg-muted text-foreground',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan performa tokomu hari ini.</p>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <p className="text-xl font-extrabold leading-tight">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Grafik */}
        <Card className="p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Pendapatan 7 Hari Terakhir</h2>
            <Link href="/admin/reports" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Laporan lengkap <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DashboardChart data={stats.revenueByDay} />
        </Card>

        {/* Produk terlaris */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">Produk Terlaris</h2>
          {bestSellers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan.</p>
          ) : (
            <ol className="space-y-3">
              {bestSellers.map((p, i) => (
                <li key={`${p.productId}-${p.name}`} className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    i === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} terjual</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{formatRupiah(p.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Pesanan menunggu */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Perlu Persetujuan</h2>
          <Link href="/admin/orders?status=pending" className="text-xs font-semibold text-primary hover:underline">
            Lihat semua
          </Link>
        </div>
        {pendingOrders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada pesanan menunggu.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted"
              >
                <div>
                  <p className="font-mono text-sm font-bold">{order.orderToken}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customerName ?? 'Customer'} — {order.items.length} item
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatRupiah(order.total)}</span>
                  <OrderStatusBadge status={order.orderStatus} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
