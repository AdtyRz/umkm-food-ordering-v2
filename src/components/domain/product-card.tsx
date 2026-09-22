'use client';

import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';
import { StockBadge } from './stock-badge';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/utils';
import type { ProductWithCategory } from '@/types';

export function ProductCard({
  product,
  onClick,
}: {
  product: ProductWithCategory;
  onClick?: () => void;
}) {
  const soldOut = product.stockStatus === 'out' || !product.isAvailable;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soldOut}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all',
        !soldOut && 'hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]',
        soldOut && 'opacity-60'
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.imagePath ? (
          <Image
            src={`/api/images?path=${encodeURIComponent(product.imagePath)}`}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/60" aria-hidden>
            <UtensilsCrossed className="h-8 w-8" />
          </div>
        )}
        {soldOut && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
            Habis
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</h3>
        <p className="text-sm font-bold text-primary">{formatRupiah(product.price)}</p>
        <div className="mt-auto pt-1">
          <StockBadge status={product.stockStatus} />
        </div>
      </div>
    </button>
  );
}
