import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/constants';
import { formatDateTime } from '@/utils';
import type { OrderStatus } from '@/types';

type HistoryEntry = {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
};

export function OrderTimeline({
  currentStatus,
  histories = [],
}: {
  currentStatus: OrderStatus;
  histories?: HistoryEntry[];
}) {
  // Status terminal negatif → tampilkan pesan khusus
  if (currentStatus === 'rejected' || currentStatus === 'cancelled') {
    const entry = histories.find((h) => h.status === currentStatus);
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center animate-fade-in">
        <p className="font-bold text-destructive">
          {ORDER_STATUS_LABELS[currentStatus]}
        </p>
        {entry?.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
        {entry && (
          <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
        )}
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  return (
    <ol className="relative space-y-0" aria-label="Status pesanan">
      {ORDER_STATUS_FLOW.map((status, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;
        const entry = histories.find((h) => h.status === status);
        const isLast = i === ORDER_STATUS_FLOW.length - 1;

        return (
          <li key={status} className="relative flex gap-3 pb-6 last:pb-0">
            {/* Garis penghubung */}
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5 rounded',
                  isDone ? 'bg-success' : 'bg-border'
                )}
              />
            )}

            {/* Indikator */}
            <span
              aria-hidden
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                isDone && 'border-success bg-success text-white',
                isCurrent && 'border-primary bg-primary text-primary-foreground animate-pulse-ring',
                isPending && 'border-border bg-card text-muted-foreground'
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : i + 1}
            </span>

            {/* Konten */}
            <div className="min-w-0 pt-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  isDone && 'text-success',
                  isCurrent && 'text-foreground',
                  isPending && 'text-muted-foreground'
                )}
              >
                {ORDER_STATUS_LABELS[status]}
                {isCurrent && <span className="ml-2 text-xs font-normal text-primary">• sekarang</span>}
              </p>
              {entry && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                  {entry.note ? ` — ${entry.note}` : ''}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
