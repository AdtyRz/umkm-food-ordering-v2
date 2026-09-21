import { Badge } from '@/components/ui';
import { orderStatusLabel, paymentStatusLabel } from '@/utils';
import type { OrderStatus, PaymentStatus } from '@/types';

const orderTones: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning',
  approved: 'info',
  processing: 'primary',
  ready: 'primary',
  delivering: 'info',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderTones[status]}>{orderStatusLabel(status)}</Badge>;
}

const paymentTones: Record<PaymentStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  waiting_verification: 'info',
  paid: 'success',
  failed: 'danger',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTones[status]}>{paymentStatusLabel(status)}</Badge>;
}
