'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input, Label, Modal, Select, useToast } from '@/components/ui';
import { deletePromoAction, savePromoAction } from '../../actions';
import { formatRupiah } from '@/utils';
import type { PromoType } from '@/types';

type PromoRow = {
  id: string;
  name: string;
  code: string;
  type: PromoType;
  value: number;
  minimumPurchase: number;
  maximumDiscount: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY = {
  id: undefined as string | undefined,
  name: '',
  code: '',
  type: 'percentage' as PromoType,
  value: '',
  minimumPurchase: '0',
  maximumDiscount: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

export function PromosClient({ promos }: { promos: PromoRow[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<PromoRow | null>(null);

  const openEdit = (p: PromoRow) => {
    setForm({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      value: String(p.value),
      minimumPurchase: String(p.minimumPurchase),
      maximumDiscount: p.maximumDiscount != null ? String(p.maximumDiscount) : '',
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      isActive: p.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePromoAction({
        id: form.id,
        name: form.name,
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minimumPurchase: Number(form.minimumPurchase),
        maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        isActive: form.isActive,
      });
      if (res.ok) {
        push(form.id ? 'Promo diperbarui' : 'Promo dibuat', 'success');
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
      const res = await deletePromoAction(deleteTarget.id);
      setDeleteTarget(null);
      if (res.ok) {
        push('Promo dihapus', 'success');
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
          <Plus className="h-4 w-4" /> Buat Promo
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {promos.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="font-mono text-xs font-bold text-primary">{p.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(p)} aria-label={`Hapus ${p.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                {p.type === 'percentage'
                  ? `Diskon ${p.value}%${p.maximumDiscount ? ` (maks ${formatRupiah(p.maximumDiscount)})` : ''}`
                  : `Potongan ${formatRupiah(p.value)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Min. belanja {formatRupiah(p.minimumPurchase)}
                {p.startsAt && ` • ${p.startsAt} s/d ${p.endsAt || '∞'}`}
              </p>
            </div>
            <div className="mt-2">
              <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
            </div>
          </Card>
        ))}
        {promos.length === 0 && (
          <Card className="col-span-full p-10 text-center text-sm text-muted-foreground">
            Belum ada promo. Buat promo pertamamu!
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit Promo' : 'Buat Promo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pr-name" required>Nama Promo</Label>
            <Input id="pr-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-code" required>Kode</Label>
              <Input id="pr-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="HEMAT10" required maxLength={20} className="font-mono" />
            </div>
            <div>
              <Label htmlFor="pr-type" required>Jenis</Label>
              <Select id="pr-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PromoType }))}>
                <option value="percentage">Persentase (%)</option>
                <option value="fixed_amount">Nominal (Rp)</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-value" required>
                {form.type === 'percentage' ? 'Nilai (%)' : 'Nilai (Rp)'}
              </Label>
              <Input id="pr-value" type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="pr-max">Maks. Diskon (Rp)</Label>
              <Input id="pr-max" type="number" min={0} value={form.maximumDiscount} onChange={(e) => setForm((f) => ({ ...f, maximumDiscount: e.target.value }))} placeholder="Kosong = tanpa batas" />
            </div>
          </div>
          <div>
            <Label htmlFor="pr-min">Minimum Belanja (Rp)</Label>
            <Input id="pr-min" type="number" min={0} value={form.minimumPurchase} onChange={(e) => setForm((f) => ({ ...f, minimumPurchase: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pr-start">Mulai</Label>
              <Input id="pr-start" type="date" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pr-end">Berakhir</Label>
              <Input id="pr-end" type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Promo aktif
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" loading={pending}>Simpan</Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Hapus promo?" size="sm">
        <p className="text-sm text-muted-foreground">
          Promo <b>{deleteTarget?.name}</b> ({deleteTarget?.code}) akan dihapus permanen.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="destructive" className="flex-1" loading={pending} onClick={handleDelete}>Ya, Hapus</Button>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
        </div>
      </Modal>
    </div>
  );
}
