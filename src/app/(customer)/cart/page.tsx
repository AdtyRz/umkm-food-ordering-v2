'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react';
import { Button, Card, EmptyState, QuantityStepper, useToast } from '@/components/ui';
import { useCart } from '@/hooks/use-cart';
import { useRealtime } from '@/hooks/use-realtime';
import { formatRupiah } from '@/utils';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, subtotal, ready } = useCart();
  const { push } = useToast();

  // Produk yang habis saat di keranjang (realtime dari admin)
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());

  useRealtime((event) => {
    if (event.topic === 'products' && event.type === 'product.changed') {
      const { productId, isAvailable, stockStatus } = event.payload as {
        productId: string;
        isAvailable: boolean;
        stockStatus: string;
      };
      if (!isAvailable || stockStatus === 'out') {
        setClosedIds((prev) => new Set(prev).add(productId));
        push('Ada produk yang baru habis. Cek keranjangmu ya.', 'info');
      }
    }
  });

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Keranjang kamu masih kosong"
          description="Yuk pilih makanan favoritmu dulu!"
          action={
            <Link href="/menu">
              <Button>Lihat Menu</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const hasClosedItem = items.some((i) => closedIds.has(i.productId));

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Keranjang</h1>

      {hasClosedItem && (
        <div className="rounded-2xl border border-warning/40 bg-warning-soft p-3.5 text-sm text-warning">
          Ada produk yang baru saja habis. Hapus atau ganti sebelum checkout ya.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const closed = closedIds.has(item.productId);
          return (
            <Card key={item.productId} className="flex gap-3 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {item.imagePath ? (
                  <Image
                    src={`/api/images?path=${encodeURIComponent(item.imagePath)}`}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/60" aria-hidden>
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">{item.name}</h3>
                  <button
                    onClick={() => removeItem(item.productId)}
                    aria-label={`Hapus ${item.name}`}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{formatRupiah(item.price)}</p>
                {closed && <p className="text-xs font-semibold text-destructive">Produk habis</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <QuantityStepper
                    size="sm"
                    value={item.quantity}
                    onChange={(qty) => updateQuantity(item.productId, qty)}
                  />
                  <span className="text-sm font-bold">{formatRupiah(item.price * item.quantity)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="space-y-2 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
          <span>Total</span>
          <span className="text-primary">{formatRupiah(subtotal)}</span>
        </div>
        <Link href="/checkout" className="block pt-2">
          <Button size="lg" className="w-full" disabled={hasClosedItem}>
            Lanjut ke Checkout
          </Button>
        </Link>
        <Button variant="ghost" className="w-full" onClick={clearCart}>
          Kosongkan Keranjang
        </Button>
      </Card>
    </div>
  );
}
