import { Badge } from '@/components/ui';
import { STOCK_STATUS_LABELS } from '@/constants';
import type { StockStatus } from '@/types';

export function StockBadge({ status }: { status: StockStatus }) {
  if (status === 'many') {
    return <Badge tone="success">{STOCK_STATUS_LABELS.many}</Badge>;
  }
  if (status === 'low') {
    return <Badge tone="warning">Sedikit Lagi</Badge>;
  }
  return <Badge tone="danger">Habis</Badge>;
}
