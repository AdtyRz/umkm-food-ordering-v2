import Link from 'next/link';
import { getOrdersForAdmin } from '@/services/order';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/domain/order-status-badge';
import { Card, EmptyState } from '@/components/ui';
import { formatDateTime, formatRupiah, paymentMethodLabel } from '@/utils';
import type { OrderStatus } from '@/types';

export const metadata = { title: 'Pesanan' };
export const dynamic = 'force-dynamic';

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'processing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
  { value: 'delivering', label: 'Diantarkan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = FILTERS.some((f) => f.value === status && f.value !== 'all')
    ? (status as OrderStatus)
    : undefined;

  const orders = await getOrdersForAdmin(validStatus);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pesanan</h1>
        <p className="text-sm text-muted-foreground">Kelola dan pantau seluruh pesanan.</p>
      </div>

      {/* Filter status */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = (status ?? 'all') === f.value;
          return (
            <Link
              key={f.value}
              href={`/admin/orders?status=${f.value}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl" aria-hidden>📭</span>}
          title="Tidak ada pesanan"
          description="Belum ada pesanan pada filter ini."
        />
      ) : (
        <Card className="overflow-x-auto">
          {/* Tabel desktop */}
          <table className="hidden w-full text-left text-sm md:table">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Bayar</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/60 transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-bold text-primary hover:underline">
                      {o.orderToken}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.customerName ?? '-'}</p>
                    <p className="text-xs text-muted-foreground">{o.customerPhone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 font-bold">{formatRupiah(o.total)}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs">{paymentMethodLabel(o.paymentMethod)}</p>
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.orderStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Card mobile */}
          <div className="divide-y divide-border md:hidden">
            {orders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="block p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold text-primary">{o.orderToken}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <OrderStatusBadge status={o.orderStatus} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {o.customerName ?? '-'} • {paymentMethodLabel(o.paymentMethod)}
                  </div>
                  <span className="text-sm font-bold">{formatRupiah(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
