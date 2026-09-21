'use client';

import Image from 'next/image';
import { Clock, MoonStar, Sun } from 'lucide-react';
import { useRealtime } from '@/hooks/use-realtime';
import { useTheme } from '@/hooks/use-theme';
import { formatHourRange } from '@/utils';
import type { StoreInfo, StoreOpenStatus } from '@/types';

export function StoreHeader({
  store,
  status,
}: {
  store: StoreInfo;
  status: StoreOpenStatus;
}) {
  const { resolved, setTheme } = useTheme();

  // Realtime: status toko berubah → refresh data server components
  useRealtime(undefined, { refreshOnEvent: true });

  const isOpen = status.isOpen;

  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-5 text-primary-foreground shadow-md">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/20 backdrop-blur">
          {store.logoPath ? (
            <Image
              src={`/api/images?path=${encodeURIComponent(store.logoPath)}`}
              alt={store.storeName}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl" aria-hidden>
              🍽️
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight">{store.storeName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isOpen ? 'bg-white/25' : 'bg-black/25'
              }`}
            >
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${isOpen ? 'bg-emerald-300 animate-pulse' : 'bg-red-300'}`}
              />
              {isOpen ? 'BUKA' : 'TUTUP'}
            </span>
            {status.todayHours && !status.todayHours.isClosed && (
              <span className="inline-flex items-center gap-1 text-xs font-medium opacity-90">
                <Clock className="h-3.5 w-3.5" />
                {formatHourRange(status.todayHours.openTime, status.todayHours.closeTime)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Ganti tema terang/gelap"
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform hover:scale-105"
        >
          {resolved === 'dark' ? <Sun className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
