'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ImagePlus, Pencil, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import { Button, Card, Input, Label, Modal, Select, Textarea, useToast } from '@/components/ui';
import { StockBadge } from '@/components/domain/stock-badge';
import {
  deleteProductAction,
  saveProductAction,
  setProductAvailabilityAction,
  uploadImageAction,
} from '../../actions';
import { formatRupiah } from '@/utils';
import type { ProductWithCategory, StockStatus } from '@/types';

type CategoryLite = { id: string; name: string };

const EMPTY_FORM = {
  id: undefined as string | undefined,
  name: '',
  description: '',
  price: '' as string,
  categoryId: '' as string,
  stockStatus: 'many' as StockStatus,
  isAvailable: true,
  imagePath: null as string | null,
};

export function ProductsClient({
  products,
  categories,
}: {
  products: ProductWithCategory[];
  categories: CategoryLite[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithCategory | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: ProductWithCategory) => {
    setForm({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      categoryId: p.categoryId ?? '',
      stockStatus: p.stockStatus,
      isAvailable: p.isAvailable,
      imagePath: p.imagePath,
    });
    setModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'products');
    const res = await uploadImageAction(fd);
    setUploading(false);
    if (res.ok) {
      setForm((f) => ({ ...f, imagePath: res.path }));
      push('Gambar terupload', 'success');
    } else {
      push(res.error, 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveProductAction({
        id: form.id,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        categoryId: form.categoryId || null,
        stockStatus: form.stockStatus,
        isAvailable: form.isAvailable,
        imagePath: form.imagePath,
      });
      if (res.ok) {
        push(form.id ? 'Produk diperbarui' : 'Produk ditambahkan', 'success');
        setModalOpen(false);
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  const handleQuickStock = (p: ProductWithCategory, next: StockStatus) => {
    startTransition(async () => {
      const res = await setProductAvailabilityAction(p.id, next, next !== 'out');
      if (res.ok) router.refresh();
      else push(res.error ?? 'Gagal', 'error');
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteProductAction(deleteTarget.id);
      setDeleteTarget(null);
      if (res.ok) {
        push('Produk dihapus', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari produk..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah Produk
        </Button>
      </div>

      {/* Tabel */}
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Harga</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/60 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.imagePath ? (
                        <Image src={`/api/images?path=${encodeURIComponent(p.imagePath)}`} alt="" fill sizes="44px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/60" aria-hidden>
                          <UtensilsCrossed className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.categoryName ?? '-'}</td>
                <td className="px-4 py-3 font-semibold">{formatRupiah(p.price)}</td>
                <td className="px-4 py-3">
                  <Select
                    aria-label={`Stok ${p.name}`}
                    value={p.stockStatus}
                    onChange={(e) => handleQuickStock(p, e.target.value as StockStatus)}
                    className="h-8 w-32 text-xs"
                  >
                    <option value="many">Masih Banyak</option>
                    <option value="low">Sedikit Lagi</option>
                    <option value="out">Habis</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} aria-label={`Hapus ${p.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Belum ada produk. Klik "Tambah Produk" untuk memulai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit Produk' : 'Tambah Produk'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload gambar */}
          <div>
            <Label>Foto Produk</Label>
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
                {form.imagePath ? (
                  <Image src={`/api/images?path=${encodeURIComponent(form.imagePath)}`} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImagePlus className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
                <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                  Pilih Gambar
                </Button>
                <p className="mt-1 text-[11px] text-muted-foreground">JPG/PNG/WebP, maks 2MB</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="p-name" required>Nama</Label>
            <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={150} />
          </div>

          <div>
            <Label htmlFor="p-desc">Deskripsi</Label>
            <Textarea id="p-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-price" required>Harga (Rp)</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step={500}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="p-cat">Kategori</Label>
              <Select id="p-cat" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">— Tanpa kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-stock">Status Stok</Label>
              <Select id="p-stock" value={form.stockStatus} onChange={(e) => setForm((f) => ({ ...f, stockStatus: e.target.value as StockStatus }))}>
                <option value="many">Masih Banyak</option>
                <option value="low">Sedikit Lagi</option>
                <option value="out">Habis</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-avail">Tersedia?</Label>
              <Select
                id="p-avail"
                value={form.isAvailable ? '1' : '0'}
                onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.value === '1' }))}
              >
                <option value="1">Ya — tampil di menu</option>
                <option value="0">Nonaktif — disembunyikan</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" loading={pending}>
              Simpan
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Konfirmasi hapus */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Hapus produk?" size="sm">
        <p className="text-sm text-muted-foreground">
          Produk <b>{deleteTarget?.name}</b> akan dihapus permanen.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="destructive" className="flex-1" loading={pending} onClick={handleDelete}>
            Ya, Hapus
          </Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            Batal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
