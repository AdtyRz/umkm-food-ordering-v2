'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input, Label, Modal, Textarea, useToast } from '@/components/ui';
import { deleteCategoryAction, saveCategoryAction } from '../../actions';

type Cat = { id: string; name: string; description: string; sortOrder: number; isActive: boolean };

const EMPTY = {
  id: undefined as string | undefined,
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};
type FormState = typeof EMPTY;

export function CategoriesClient({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);

  const openEdit = (c: Cat) => {
    setForm({ ...c });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCategoryAction(form);
      if (res.ok) {
        push(form.id ? 'Kategori diperbarui' : 'Kategori ditambahkan', 'success');
        setModalOpen(false);
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteCategoryAction(deleteTarget.id);
      setDeleteTarget(null);
      if (res.ok) {
        push('Kategori dihapus', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm(EMPTY); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Tambah Kategori
        </Button>
      </div>

      <Card className="divide-y divide-border">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
              {c.sortOrder}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name}</p>
              {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
            </div>
            <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
            <button onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => setDeleteTarget(c)} aria-label={`Hapus ${c.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">Belum ada kategori.</p>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit Kategori' : 'Tambah Kategori'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="c-name" required>Nama</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={80} />
          </div>
          <div>
            <Label htmlFor="c-desc">Deskripsi</Label>
            <Textarea id="c-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={255} className="min-h-16" />
          </div>
          <div>
            <Label htmlFor="c-order">Urutan</Label>
            <Input id="c-order" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Kategori aktif (tampil di menu customer)
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" loading={pending}>Simpan</Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Hapus kategori?" size="sm">
        <p className="text-sm text-muted-foreground">
          Kategori <b>{deleteTarget?.name}</b> akan dihapus. Produk di dalamnya tidak ikut terhapus (kategori jadi kosong).
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="destructive" className="flex-1" loading={pending} onClick={handleDelete}>Ya, Hapus</Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
        </div>
      </Modal>
    </div>
  );
}
