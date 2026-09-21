'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Switch, useToast } from '@/components/ui';
import { saveOperatingHoursAction } from '../../actions';
import { DAY_NAMES } from '@/constants';
import type { OperatingHourRow } from '@/utils';

export function HoursClient({ hours }: { hours: OperatingHourRow[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [rows, setRows] = useState(hours);
  const [pending, startTransition] = useTransition();

  const update = (day: number, patch: Partial<OperatingHourRow>) => {
    setRows((prev) => prev.map((r) => (r.dayOfWeek === day ? { ...r, ...patch } : r)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveOperatingHoursAction({
        hours: rows.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          openTime: r.openTime,
          closeTime: r.closeTime,
          isClosed: r.isClosed,
        })),
      });
      if (res.ok) {
        push('Jam operasional tersimpan', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-bold">Jam Operasional</h2>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.dayOfWeek} className="flex items-center gap-2 rounded-xl border border-border p-2.5">
            <span className="w-16 shrink-0 text-sm font-semibold">{DAY_NAMES[r.dayOfWeek]}</span>
            <Switch
              checked={!r.isClosed}
              onChange={(open) => update(r.dayOfWeek, { isClosed: !open })}
              label={`Buka hari ${DAY_NAMES[r.dayOfWeek]}`}
            />
            {r.isClosed ? (
              <span className="flex-1 text-right text-xs text-muted-foreground">Tutup</span>
            ) : (
              <div className="flex flex-1 items-center justify-end gap-1.5">
                <Input
                  type="time"
                  aria-label={`Buka ${DAY_NAMES[r.dayOfWeek]}`}
                  value={r.openTime}
                  onChange={(e) => update(r.dayOfWeek, { openTime: e.target.value })}
                  className="h-9 w-28 text-xs"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="time"
                  aria-label={`Tutup ${DAY_NAMES[r.dayOfWeek]}`}
                  value={r.closeTime}
                  onChange={(e) => update(r.dayOfWeek, { closeTime: e.target.value })}
                  className="h-9 w-28 text-xs"
                />
              </div>
            )}
          </div>
        ))}
        <Button type="submit" loading={pending} className="w-full">
          Simpan Jam Operasional
        </Button>
      </form>
    </Card>
  );
}
