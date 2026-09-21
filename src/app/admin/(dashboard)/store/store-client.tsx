'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, Textarea, useToast } from '@/components/ui';
import { saveStoreSettingsAction } from '../../actions';

type StoreForm = {
  storeName: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  developerName: string;
  developerInfo: string;
  developerContact: string;
};

export function StoreSettingsClient({ store }: { store: StoreForm }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState(store);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof StoreForm, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveStoreSettingsAction({
        ...form,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      if (res.ok) {
        push('Pengaturan toko tersimpan', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <Card className="p-4">
      <h2 className="mb-4 text-sm font-bold">Informasi Toko</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="s-name" required>Nama Toko</Label>
          <Input id="s-name" value={form.storeName} onChange={(e) => set('storeName', e.target.value)} required maxLength={120} />
        </div>
        <div>
          <Label htmlFor="s-desc">Deskripsi</Label>
          <Textarea id="s-desc" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={1000} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-phone">Telepon</Label>
            <Input id="s-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-wa">WhatsApp (62xxx)</Label>
            <Input id="s-wa" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="6281234567890" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="s-tz">Timezone</Label>
            <Input id="s-tz" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} placeholder="Asia/Jakarta" />
          </div>
        </div>
        <div>
          <Label htmlFor="s-addr">Alamat</Label>
          <Textarea id="s-addr" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={500} className="min-h-16" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="s-lat">Latitude</Label>
            <Input
              id="s-lat"
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="s-lng">Longitude</Label>
            <Input
              id="s-lng"
              type="number"
              step="any"
              value={form.longitude ?? ''}
              onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <h3 className="mb-3 text-sm font-bold">Info Developer</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="s-dev-name">Nama Developer</Label>
              <Input id="s-dev-name" value={form.developerName} onChange={(e) => set('developerName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-dev-info">Informasi</Label>
              <Input id="s-dev-info" value={form.developerInfo} onChange={(e) => set('developerInfo', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-dev-contact">Kontak (URL)</Label>
              <Input id="s-dev-contact" value={form.developerContact} onChange={(e) => set('developerContact', e.target.value)} placeholder="https://github.com/username" />
            </div>
          </div>
        </div>

        <Button type="submit" loading={pending} className="w-full">
          Simpan Pengaturan
        </Button>
      </form>
    </Card>
  );
}
