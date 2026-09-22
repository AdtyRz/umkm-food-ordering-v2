'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bot, ImagePlus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Label, Switch, useToast } from '@/components/ui';
import { savePaymentSettingsAction, saveWhatsAppBotSettingsAction, uploadImageAction } from '../../actions';

export function PaymentSettingsClient({
  qrisReceiverName,
  qrisImagePath,
  codEnabled,
  waBotNumber,
  waBotEnabled,
}: {
  qrisReceiverName: string;
  qrisImagePath: string | null;
  codEnabled: boolean;
  waBotNumber: string | null;
  waBotEnabled: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [receiver, setReceiver] = useState(qrisReceiverName);
  const [qrisPath, setQrisPath] = useState(qrisImagePath);
  const [cod, setCod] = useState(codEnabled);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- Bot WA ----
  const [botNumber, setBotNumber] = useState(waBotNumber ?? '');
  const [botEnabled, setBotEnabled] = useState(waBotEnabled);
  const [botPending, startBotTransition] = useTransition();

  const handleBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startBotTransition(async () => {
      const res = await saveWhatsAppBotSettingsAction({
        waBotNumber: botNumber.trim(),
        waBotEnabled: botEnabled,
      });
      if (res.ok) {
        push(
          botEnabled
            ? 'Bot WA aktif — notifikasi status dikirim otomatis'
            : 'Bot WA nonaktif — pakai tombol Kirim Pemberitahuan manual di halaman pesanan',
          'success'
        );
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'qris');
    const res = await uploadImageAction(fd);
    setUploading(false);
    if (res.ok) {
      setQrisPath(res.path);
      push('Foto QR terupload — jangan lupa tekan Simpan.', 'success');
    } else {
      push(res.error, 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePaymentSettingsAction({
        qrisReceiverName: receiver,
        qrisImagePath: qrisPath,
        codEnabled: cod,
      });
      if (res.ok) {
        push('Pengaturan pembayaran tersimpan', 'success');
        router.refresh();
      } else {
        push(res.error ?? 'Gagal', 'error');
      }
    });
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-bold">Pembayaran</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="pay-qris">Nama Penerima QRIS</Label>
          <Input id="pay-qris" value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Nama yang muncul di konfirmasi" maxLength={120} />
        </div>

        {/* Foto QRIS — ditampilkan ke customer saat memilih QRIS */}
        <div>
          <Label>Foto QRIS (opsional)</Label>
          <div className="flex items-center gap-3">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
              {qrisPath ? (
                <Image
                  src={`/api/images?path=${encodeURIComponent(qrisPath)}`}
                  alt="QRIS"
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="px-2 text-center text-[10px] text-muted-foreground">Belum ada QR</span>
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
                  e.target.value = '';
                }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> Pilih Foto
                </Button>
                {qrisPath && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setQrisPath(null)}>
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                JPG/PNG/WebP, maks 2MB. Tampil saat customer memilih QRIS.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-semibold">COD / Tunai</p>
            <p className="text-xs text-muted-foreground">Customer bisa bayar tunai saat pesanan tiba</p>
          </div>
          <Switch checked={cod} onChange={setCod} label="Aktifkan COD" />
        </div>
        <Button type="submit" loading={pending} className="w-full">
          Simpan
        </Button>
      </form>

      {/* ---------- Bot WhatsApp ---------- */}
      <form onSubmit={handleBotSubmit} className="space-y-3 border-t border-border pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Bot className="h-4 w-4 text-primary" /> Bot WhatsApp
        </h3>
        <div>
          <Label htmlFor="bot-number">Nomor Bot (perangkat pengirim)</Label>
          <Input
            id="bot-number"
            type="tel"
            inputMode="numeric"
            placeholder="081234567890"
            value={botNumber}
            onChange={(e) => setBotNumber(e.target.value)}
            maxLength={16}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Nomor WA yang terpasang di provider bot (Fonnte dkk). Format bebas —
            otomatis dinormalisasi ke 62.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-semibold">Status Bot</p>
            <p className="text-xs text-muted-foreground">
              {botEnabled
                ? 'Aktif — pemberitahuan status dikirim otomatis ke customer'
                : 'Nonaktif — kirim pemberitahuan MANUAL via tombol di halaman pesanan'}
            </p>
          </div>
          <Switch checked={botEnabled} onChange={setBotEnabled} label="Aktifkan bot WA" />
        </div>
        <Button type="submit" loading={botPending} className="w-full">
          Simpan Bot WA
        </Button>
      </form>
    </Card>
  );
}
