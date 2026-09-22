'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ImagePlus, Store as StoreIcon, Trash2 } from 'lucide-react';
import { Button, Card, Input, Label, Textarea, useToast } from '@/components/ui';
import { saveStoreSettingsAction, uploadImageAction } from '../../actions';

type StoreForm = {
  storeName: string;
  logoPath: string | null;
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
  const [uploading, setUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof StoreForm, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'store');
    const res = await uploadImageAction(fd);
    setUploading(false);
    if (res.ok) {
      set('logoPath', res.path);
      push('Logo terupload — jangan lupa simpan.', 'success');
    } else {
      push(res.error, 'error');
    }
  };

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
        {/* Logo (opsional) */}
        <div>
          <Label>Logo Toko (opsional)</Label>
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-border bg-muted">
              {form.logoPath ? (
                <Image
                  src={`/api/images?path=${encodeURIComponent(form.logoPath)}`}
                  alt="Logo toko"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground" aria-hidden>
                  <StoreIcon className="h-7 w-7" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={uploading}
                  onClick={() => logoFileRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" /> Pilih Logo
                </Button>
                {form.logoPath && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set('logoPath', null)}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">JPG/PNG/WebP, maks 2MB. Tampil di header menu customer.</p>
            </div>
          </div>
        </div>
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
