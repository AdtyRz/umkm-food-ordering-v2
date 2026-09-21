import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerSession } from '@/services/customer-session';
import { getOrderByTokenForSession } from '@/services/order';
import { getStoreInfo } from '@/services/store';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/domain/order-status-badge';
import { OrderTimeline } from '@/components/domain/order-timeline';
import { Card } from '@/components/ui';
import { OrderDetailRealtime } from './realtime';
import { formatDateTime, formatRupiah, paymentMethodLabel } from '@/utils';
import type { OrderWithDetails } from '@/types';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getCustomerSession();
  if (!session) notFound();

  // Keamanan: order hanya bisa diakses dari session pemiliknya
  const order = await getOrderByTokenForSession(token.toUpperCase(), session.sessionId);
  if (!order) notFound();

  const store = await getStoreInfo();

  return (
    <div className="space-y-4 pt-2">
      <OrderDetailRealtime orderToken={order.orderToken} />

      <div className="flex items-center justify-between">
        <h1 className="font-mono text-xl font-extrabold tracking-tight">{order.orderToken}</h1>
        <OrderStatusBadge status={order.orderStatus} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Dibuat {formatDateTime(order.createdAt)}</p>

      {/* Status & timeline realtime */}
      <Card className="p-4">
        <h2 className="mb-4 text-sm font-bold">Status Pesanan</h2>
        <OrderTimeline currentStatus={order.orderStatus} histories={order.histories} />
      </Card>

      {/* Pembayaran */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Pembayaran</h2>
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Metode</span>
          <span className="font-semibold">{paymentMethodLabel(order.paymentMethod)}</span>
        </div>

        {order.paymentMethod === 'qris' && (
          <div className="rounded-xl bg-muted p-3 text-center">
            {store?.qrisImagePath ? (
              <div className="relative mx-auto aspect-square w-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images?path=${encodeURIComponent(store.qrisImagePath)}`}
                  alt="QRIS"
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-square w-44 mx-auto items-center justify-center rounded-lg border-2 border-dashed border-border text-5xl" aria-hidden>
                📱
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Scan QRIS di atas, lalu tunggu verifikasi admin.
              {store?.qrisReceiverName ? ` Penerima: ${store.qrisReceiverName}.` : ''}
            </p>
          </div>
        )}

        {order.paymentMethod === 'cod' && (
          <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            Bayar tunai saat pesanan diterima. Siapkan uang pas ya!
          </p>
        )}

        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
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

      {/* Item pesanan */}
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-bold">Item</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.productName} ×{item.quantity}
            </span>
            <span>{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
        {order.customerNote && (
          <p className="mt-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            📝 {order.customerNote}
          </p>
        )}
      </Card>

      <Link href="/menu" className="block">
        <Card className="p-4 text-center text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
          + Pesan lagi
        </Card>
      </Link>
    </div>
  );
}
