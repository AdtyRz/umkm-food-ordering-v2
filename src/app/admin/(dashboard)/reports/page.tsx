import Link from 'next/link';
import { getRevenueReport, getBestSellers, getAnalyticsSummary, type ReportPeriod } from '@/services/report';
import { Card, EmptyState } from '@/components/ui';
import { ReportTabs } from './report-tabs';
import { formatRupiah } from '@/utils';

export const metadata = { title: 'Laporan' };
export const dynamic = 'force-dynamic';

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const validPeriod: ReportPeriod =
    period === 'weekly' || period === 'monthly' || period === 'yearly' ? period : 'daily';

  const [rows, bestSellers, analytics] = await Promise.all([
    getRevenueReport(validPeriod),
    getBestSellers(10),
    getAnalyticsSummary(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Laporan</h1>
        <p className="text-sm text-muted-foreground">Analisis penjualan & pendapatan.</p>
      </div>

      <ReportTabs current={validPeriod} />

      {/* Ringkasan */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total Pendapatan', value: formatRupiah(analytics.revenue) },
          { label: 'Total Pesanan', value: String(analytics.totalOrders) },
          { label: 'Rata-rata / Order', value: formatRupiah(analytics.averageOrderValue) },
          { label: 'Total Diskon', value: formatRupiah(analytics.totalDiscount) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-lg font-extrabold">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-x-auto xl:col-span-2">
          <h2 className="px-4 pt-4 text-sm font-bold">
            Pendapatan — {PERIOD_LABELS[validPeriod]}
          </h2>
          {rows.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi pada periode ini"
              description="Laporan akan terisi otomatis saat ada pesanan."
            />
          ) : (
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="border-y border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">Periode</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Diskon</th>
                  <th className="px-4 py-2.5 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-b border-border/60">
                    <td className="px-4 py-2.5 font-medium">{r.period}</td>
                    <td className="px-4 py-2.5">{r.totalOrders}</td>
                    <td className="px-4 py-2.5 text-success">{r.discount > 0 ? `-${formatRupiah(r.discount)}` : '-'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">{formatRupiah(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

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
    </div>
  );
}
