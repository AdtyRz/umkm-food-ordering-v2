'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, Switch, useToast } from '@/components/ui';
import { savePaymentSettingsAction } from '../../actions';

export function PaymentSettingsClient({
  qrisReceiverName,
  codEnabled,
}: {
  qrisReceiverName: string;
  codEnabled: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [receiver, setReceiver] = useState(qrisReceiverName);
  const [cod, setCod] = useState(codEnabled);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await savePaymentSettingsAction({ qrisReceiverName: receiver, codEnabled: cod });
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
    </Card>
  );
}
