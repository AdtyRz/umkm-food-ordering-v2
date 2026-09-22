'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { submitPaymentProofAction } from '@/app/actions/checkout';

/**
 * Upload bukti transfer di halaman detail pesanan — dipakai bila customer
 * menutup popup QRIS saat checkout sebelum melampirkan bukti.
 * Bukti wajib: sampai ada bukti, admin tidak bisa memverifikasi.
 */
export function PaymentProofUploader({ orderToken }: { orderToken: string }) {
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (sent) {
    return (
      <p className="rounded-xl bg-success-soft p-3 text-xs font-semibold text-success">
        Bukti terkirim — menunggu verifikasi admin.
      </p>
    );
  }

  const handleUpload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      push('Format harus JPG/PNG/WebP.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      push('Ukuran maksimal 2MB.', 'error');
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await submitPaymentProofAction(orderToken, fd);
    setSubmitting(false);
    if (!res.ok) {
      push(res.error ?? 'Gagal', 'error');
      return;
    }
    setSent(true);
    push('Bukti transfer terkirim — menunggu verifikasi admin.', 'success');
  };

  return (
    <div className="space-y-2">
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
      <Button
        variant="secondary"
        className="w-full"
        loading={submitting}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-4 w-4" /> Kirim Bukti Transfer
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        Bukti wajib agar admin bisa memverifikasi pembayaran (JPG/PNG/WebP, maks 2MB).
      </p>
    </div>
  );
}
