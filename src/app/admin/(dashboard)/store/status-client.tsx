'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Power } from 'lucide-react';
import { Button, Card, useToast } from '@/components/ui';
import { setStoreStatusModeAction } from '../../actions';
import { useRealtime } from '@/hooks/use-realtime';
import { cn } from '@/lib/utils';

const MODES = [
  { value: 'automatic', label: 'Otomatis (jam operasional)', hint: 'Status mengikuti jam buka tiap hari' },
  { value: 'force_open', label: 'Buka Paksa', hint: 'Toko selalu terbuka apa pun jadwalnya' },
  { value: 'force_closed', label: 'Tutup Paksa', hint: 'Toko tutup, order baru ditolak' },
] as const;

export function StoreStatusClient({ mode }: { mode: 'automatic' | 'force_open' | 'force_closed' }) {
  const router = useRouter();
  const { push } = useToast();
  const [current, setCurrent] = useState(mode);
  const [pending, startTransition] = useTransition();

  // Pantau perubahan realtime (mis. diubah dari perangkat lain)
  useRealtime();

  const change = (next: typeof current) => {
    setCurrent(next);
    startTransition(async () => {
      const res = await setStoreStatusModeAction({ mode: next });
      if (res.ok) {
        push('Status toko diperbarui', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Power className="h-4 w-4" /> Status Toko
      </h2>
      <div className="space-y-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => change(m.value)}
            disabled={pending}
            className={cn(
              'flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-all',
              current === m.value
                ? 'border-primary bg-primary-soft'
                : 'border-border hover:border-primary/40'
            )}
          >
            <span
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
                current === m.value ? 'border-primary bg-primary' : 'border-muted-foreground/40'
              )}
              aria-hidden
            />
            <span>
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
