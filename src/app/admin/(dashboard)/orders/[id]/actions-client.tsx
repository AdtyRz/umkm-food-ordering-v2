'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, Label, useToast } from '@/components/ui';
import { OrderStatusBadge } from '@/components/domain/order-status-badge';
import { updateOrderStatusAction, updatePaymentStatusAction } from '../../../actions';
import { ORDER_STATUS_LABELS } from '@/constants';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types';

/** Transisi status yang valid dari status saat ini. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['delivering', 'cancelled'],
  delivering: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'waiting_verification',
  'paid',
  'failed',
];

export function OrderDetailActions({
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');

  const nextStatuses = TRANSITIONS[orderStatus];
  const canChangeStatus = nextStatuses.length > 0;

  const submitStatus = (next: OrderStatus) => {
    startTransition(async () => {
      const res = await updateOrderStatusAction({
        orderId,
        status: next,
        note: note.trim() || undefined,
      });
      if (res.ok) {
        push(`Status → ${ORDER_STATUS_LABELS[next]}`, 'success');
        setNote('');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  const submitPayment = (next: PaymentStatus) => {
    startTransition(async () => {
      const res = await updatePaymentStatusAction({ orderId, status: next });
      if (res.ok) {
        push('Status pembayaran diperbarui', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-sm font-bold">Aksi</h2>

      {/* Status order */}
      <div className="space-y-2">
        <Label>Status Pesanan</Label>
        {canChangeStatus ? (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === 'rejected' || s === 'cancelled' ? 'destructive' : 'primary'}
                loading={pending}
                onClick={() => submitStatus(s)}
              >
                {ORDER_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pesanan ini sudah berakhir — status tidak dapat diubah lagi.
          </p>
        )}
        <Input placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>

      {/* Status pembayaran */}
      <div className="space-y-2 border-t border-border pt-4">
        <Label>
          Pembayaran — {paymentMethod === 'qris' ? 'QRIS' : 'COD'}
        </Label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_STATUSES.filter((s) => s !== paymentStatus).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === 'paid' ? 'primary' : s === 'failed' ? 'destructive' : 'secondary'}
              loading={pending}
              onClick={() => submitPayment(s)}
            >
              {s === 'paid' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {PAYMENT_LABELS[s]}
            </Button>
          ))}
        </div>
        {paymentMethod === 'qris' && paymentStatus === 'waiting_verification' && (
          <p className="rounded-xl bg-warning-soft p-2.5 text-xs text-warning">
            Customer sudah scan QRIS? Verifikasi manual: cek mutasi rekening/ewallet, lalu tekan Dibayar.
          </p>
        )}
      </div>
    </Card>
  );
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Menunggu Pembayaran',
  waiting_verification: 'Menunggu Verifikasi',
  paid: 'Dibayar',
  failed: 'Gagal',
};
