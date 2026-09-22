import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { getCustomerSession } from '@/services/customer-session';
import { getOrdersBySession } from '@/services/order';
import { OrderStatusBadge } from '@/components/domain/order-status-badge';
import { Button, Card, EmptyState } from '@/components/ui';
import { formatDateTime, formatRupiah } from '@/utils';

export const metadata = { title: 'Status Pesanan' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getCustomerSession();
  const orders = session ? await getOrdersBySession(session.sessionId) : [];

  if (orders.length === 0) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="Belum ada pesanan"
          description="Pesanan yang kamu buat akan tampil di sini."
          action={
            <Link href="/menu">
              <Button>Pesan Sekarang</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Pesanan Kamu</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.orderToken}`} className="block">
            <Card className="p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-primary">{order.orderToken}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="min-w-0 text-xs text-muted-foreground">
                  {order.items
                    .slice(0, 2)
                    .map((i) => `${i.productName} ×${i.quantity}`)
                    .join(', ')
                    .concat(order.items.length > 2 ? ` +${order.items.length - 2} lainnya` : '')}
                </div>
                <p className="shrink-0 text-sm font-extrabold">{formatRupiah(order.total)}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
