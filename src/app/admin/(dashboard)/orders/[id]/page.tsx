import { notFound } from 'next/navigation';
import { getAdminSession } from '@/services/admin-auth';
import { getOrderByIdForAdmin } from '@/services/order';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/domain/order-status-badge';
import { OrderTimeline } from '@/components/domain/order-timeline';
import { Card } from '@/components/ui';
import { OrderDetailActions } from './actions-client';
import { formatDateTime, formatRupiah, paymentMethodLabel, paymentStatusLabel } from '@/utils';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) notFound();

  const { id } = await params;
  const order = await getOrderByIdForAdmin(id);
  if (!order) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-mono text-xl font-extrabold">{order.orderToken}</h1>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.orderStatus} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Customer */}
          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">Customer</h2>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Nama</span>
              <span className="font-medium">{order.customerName ?? '-'}</span>
              <span className="text-muted-foreground">No. HP</span>
              <span className="font-medium">{order.customerPhone ?? '-'}</span>
              {order.customerNote && (
                <>
                  <span className="text-muted-foreground">Catatan</span>
                  <span className="font-medium">📝 {order.customerNote}</span>
                </>
              )}
            </div>
          </Card>

          {/* Item */}
          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">Produk</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.productName} <span className="text-muted-foreground">×{item.quantity}</span>
                </span>
                <span className="font-medium">{formatRupiah(item.subtotal)}</span>
              </div>
            ))}
            <div className="space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Diskon{order.promoCode ? ` (${order.promoCode})` : ''}</span>
                  <span>-{formatRupiah(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold">
                <span>Total</span>
                <span className="text-primary">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Aksi status */}
          <OrderDetailActions
            orderId={order.id}
            orderStatus={order.orderStatus}
            paymentStatus={order.paymentStatus}
            paymentMethod={order.paymentMethod}
          />

          {/* Timeline */}
          <Card className="p-4">
            <h2 className="mb-4 text-sm font-bold">Riwayat Status</h2>
            <OrderTimeline currentStatus={order.orderStatus} histories={order.histories} />
          </Card>
        </div>
      </div>
    </div>
  );
}
