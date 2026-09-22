import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, Store as StoreIcon } from 'lucide-react';
import {
  getStoreInfo,
  getOperatingHours,
  getStoreOpenStatus,
} from '@/services/store';
import { getAvailableProducts } from '@/services/catalog';
import { Card } from '@/components/ui';
import { StockBadge } from '@/components/domain/stock-badge';
import { DAY_NAMES } from '@/constants';
import { formatRupiah } from '@/utils';
import type { ProductWithCategory } from '@/types';

export const metadata = {
  title: 'Poster Toko',
  robots: { index: false },
};
export const dynamic = 'force-dynamic';

/** Produk pasti bisa dipesan: tersedia DAN stok tidak habis. */
function isOrderable(p: ProductWithCategory): boolean {
  return p.isAvailable && p.stockStatus !== 'out';
}

export default async function PosterPage() {
  const [store, hours, status, products] = await Promise.all([
    getStoreInfo(),
    getOperatingHours(),
    getStoreOpenStatus(),
    getAvailableProducts(),
  ]);
  if (!store || !status) return null;

  const today = hours.find((h) => h.dayOfWeek === new Date().getDay());
  const todayLabel = today
    ? today.isClosed
      ? 'Tutup hari ini'
      : `${today.openTime.slice(0, 5)} - ${today.closeTime.slice(0, 5)}`
    : '—';
  const dayName = DAY_NAMES[new Date().getDay()];

  // 3 rekomendasi yang pasti orderable — tidak ada produk habis di poster.
  const featured = products.filter(isOrderable).slice(0, 3);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4 animate-fade-in">
        {/* Kartu utama */}
        <Card className="overflow-hidden p-0">
          {/* Header: logo + nama + status */}
          <div
            className={
              status.isOpen
                ? 'bg-gradient-to-br from-primary to-orange-600 px-6 pb-6 pt-8 text-white'
                : 'bg-gradient-to-br from-neutral-600 to-neutral-800 px-6 pb-6 pt-8 text-white'
            }
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/30 bg-white/20">
                {store.logoPath ? (
                  <Image
                    src={`/api/images?path=${encodeURIComponent(store.logoPath)}`}
                    alt={`Logo ${store.storeName}`}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <StoreIcon className="h-8 w-8" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight">
                  {store.storeName}
                </h1>
                <span
                  className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold ${
                    status.isOpen ? 'bg-white text-success' : 'bg-white/15 text-white'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status.isOpen ? 'bg-success' : 'bg-white/70'
                    }`}
                    aria-hidden
                  />
                  {status.isOpen ? 'BUKA' : 'TUTUP'}
                </span>
              </div>
            </div>
            {store.description && (
              <p className="mt-4 line-clamp-2 text-sm text-white/85">{store.description}</p>
            )}
          </div>

          {/* Jam hari ini */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-6 py-3">
            <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              <span className="font-semibold">{dayName}</span>
              <span className="text-muted-foreground"> · {todayLabel}</span>
            </p>
          </div>

          {/* Rekomendasi */}
          <div className="space-y-3 p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Rekomendasi hari ini
            </h2>
            {featured.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Menu lengkap: <Link href="/menu" className="font-semibold text-primary hover:underline">/menu</Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {featured.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.categoryName ?? 'Menu'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-sm font-bold text-primary">{formatRupiah(p.price)}</span>
                      <StockBadge status={p.stockStatus} />
                    </div>
                    {p.imagePath && (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border">
                        <Image
                          src={`/api/images?path=${encodeURIComponent(p.imagePath)}`}
                          alt={p.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Alamat + CTA */}
          {store.address && (
            <p className="flex items-start gap-2 border-t border-border px-6 py-3 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {store.address}
            </p>
          )}
          <Link
            href="/menu"
            className="block bg-primary px-6 py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Pesan sekarang di /menu
          </Link>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Halaman ini selalu menampilkan data terkini — aman dibagikan kapan pun.
        </p>
      </div>
    </main>
  );
}
