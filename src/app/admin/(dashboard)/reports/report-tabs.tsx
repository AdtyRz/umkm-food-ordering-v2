'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ReportPeriod } from '@/services/report';

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
];

export function ReportTabs({ current }: { current: ReportPeriod }) {
  return (
    <div className="flex gap-2">
      {PERIODS.map((p) => (
        <Link
          key={p.value}
          href={`/admin/reports?period=${p.value}`}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
            current === p.value
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
