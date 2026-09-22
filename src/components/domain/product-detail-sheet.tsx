'use client';

import Image from 'next/image';
import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { BottomSheet, Button, QuantityStepper, useToast } from '@/components/ui';
import { StockBadge } from './stock-badge';
import { useCart } from '@/hooks/use-cart';
import { formatRupiah } from '@/utils';
import type { ProductWithCategory } from '@/types';

export function ProductDetailSheet({
  product,
  onClose,
}: {
  product: ProductWithCategory | null;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const { push } = useToast();
  const [qty, setQty] = useState(1);

  // Reset qty setiap kali produk berubah
  const [lastProductId, setLastProductId] = useState<string | null>(null);
  if (product && product.id !== lastProductId) {
    setLastProductId(product.id);
    setQty(1);
  }

  if (!product) return null;

  const soldOut = product.stockStatus === 'out' || !product.isAvailable;

  const handleAdd = () => {
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        quantity: qty,
        imagePath: product.imagePath,
        stockStatus: product.stockStatus,
        isAvailable: product.isAvailable,
      },
      qty
    );
    push(`${product.name} ditambahkan ke keranjang`, 'success');
    onClose();
  };

  return (
    <BottomSheet open={Boolean(product)} onClose={onClose}>
      <div className="max-h-[80vh] overflow-y-auto pb-6">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {product.imagePath ? (
            <Image
              src={`/api/images?path=${encodeURIComponent(product.imagePath)}`}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/60" aria-hidden>
              <UtensilsCrossed className="h-14 w-14" />
            </div>
          )}
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
            <StockBadge status={product.stockStatus} />
          </div>
          {product.categoryName && (
            <p className="mt-1 text-xs text-muted-foreground">{product.categoryName}</p>
          )}
          <p className="mt-2 text-lg font-bold text-primary">{formatRupiah(product.price)}</p>
          {product.description && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted p-3">
            <span className="text-sm font-medium">Jumlah</span>
            <QuantityStepper value={qty} onChange={setQty} />
          </div>

          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={soldOut}
            onClick={handleAdd}
          >
            {soldOut ? 'Stok Habis' : `Tambah ke Keranjang — ${formatRupiah(product.price * qty)}`}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
