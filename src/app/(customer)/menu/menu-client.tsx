'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, Search, ShoppingBag } from 'lucide-react';
import { StoreHeader } from '@/components/domain/store-header';
import { ProductCard } from '@/components/domain/product-card';
import { ProductDetailSheet } from '@/components/domain/product-detail-sheet';
import { Button, EmptyState, Input } from '@/components/ui';
import { useCart } from '@/hooks/use-cart';
import type { ProductWithCategory, StoreInfo, StoreOpenStatus } from '@/types';

type CategoryLite = { id: string; name: string; slug: string };

export function MenuClient({
  store,
  status,
  categories,
  products,
  sessionToken,
}: {
  store: StoreInfo;
  status: StoreOpenStatus;
  categories: CategoryLite[];
  products: ProductWithCategory[];
  sessionToken: string;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProductWithCategory | null>(null);
  const { itemCount, subtotal } = useCart();

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.categorySlug === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, query]);

  return (
    <div className="space-y-4">
      <StoreHeader store={store} status={status} />

      {!status.isOpen && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4 animate-fade-in">
          <Ban className="h-5 w-5 shrink-0 text-warning" aria-hidden />
          <div>
            <p className="text-sm font-bold text-warning">Toko sedang tutup</p>
            <p className="text-xs text-warning/90">
              Pesanan baru sementara tidak dapat dibuat. Kamu masih bisa lihat menu.
            </p>
          </div>
        </div>
      )}

      {/* Pencarian */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari makanan atau minuman..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari produk"
          className="pl-10"
        />
      </div>

      {/* Kategori pill */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Kategori">
        {[{ id: 'all', name: 'Semua', slug: 'all' }, ...categories].map((cat) => {
          const active = activeCategory === cat.slug;
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(cat.slug)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-orange-500/25'
                  : 'bg-card text-muted-foreground border border-border hover:border-primary/40'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Grid produk */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title="Tidak ada produk ditemukan"
          description="Coba kata kunci lain atau pilih kategori berbeda."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onClick={() => setSelected(product)} />
          ))}
        </div>
      )}

      {/* FAB keranjang (mobile-friendly) */}
      {itemCount > 0 && (
        <Link
          href="/cart"
          className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-[calc(32rem-2rem)] items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-xl shadow-orange-500/30 transition-transform active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingBag className="h-5 w-5" />
            {itemCount} item
          </span>
          <span className="text-sm font-extrabold">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(subtotal)}
          </span>
        </Link>
      )}

      <ProductDetailSheet product={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
