'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Download, ShieldCheck, Upload } from 'lucide-react';
import { Button, Modal, useToast } from '@/components/ui';
import { submitPaymentProofAction } from '@/app/actions/checkout';
import { formatRupiah } from '@/utils';

/**
 * Popup pembayaran QRIS — muncul di TENGAH layar (floating) saat checkout
 * dengan metode QRIS. Bukti transfer WAJIB sebelum "Saya Sudah Bayar"
 * bisa diproses (anti-penipuan); divalidasi ulang di server.
 */
export function QrisPayModal({
  open,
  onClose,
  orderToken,
  total,
  qrisImagePath,
  qrisReceiverName,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  orderToken: string;
  total: number;
  qrisImagePath: string | null;
  qrisReceiverName: string | null;
  /** Dipanggil setelah bukti pembayaran diterima server. */
  onPaid?: () => void;
}) {
  const { push } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const qrisUrl = qrisImagePath
    ? `/api/images?path=${encodeURIComponent(qrisImagePath)}`
    : null;

  const downloadQris = () => {
    if (!qrisUrl) return;
    const a = document.createElement('a');
    a.href = qrisUrl;
    a.download = `QRIS-${orderToken}.png`;
    a.click();
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      push('Format harus JPG/PNG/WebP.', 'error');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      push('Ukuran maksimal 2MB.', 'error');
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmitProof = async () => {
    if (!file) {
      push('Wajib lampirkan bukti transfer dulu ya 🙏', 'error');
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
    setDone(true);
    push('Bukti transfer terkirim — menunggu verifikasi admin.', 'success');
    onPaid?.();
  };

  return (
    <Modal open={open} onClose={onClose} title={done ? 'Pembayaran Diterima' : 'Bayar via QRIS'} size="sm">
      {done ? (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Bukti pembayaran untuk pesanan{' '}
            <span className="font-mono font-bold text-foreground">{orderToken}</span> sudah kami
            terima. Admin akan memverifikasi keasliannya — pantau statusnya di halaman pesanan
            atau WhatsApp.
          </p>
          <Button className="w-full" onClick={onClose}>
            Lihat Status Pesanan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* QR — ditengah, bisa di-download */}
          <div className="mx-auto w-fit rounded-2xl border border-border bg-white p-3">
            {qrisUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrisUrl}
                alt="QRIS"
                className="aspect-square w-44 rounded-lg object-contain"
              />
            ) : (
              <div className="flex aspect-square w-44 items-center justify-center rounded-lg border-2 border-dashed border-border p-2 text-center text-xs text-muted-foreground">
                QR belum dipasang admin — hubungi kami untuk bayar manual.
              </div>
            )}
          </div>

          <div className="space-y-1 text-center text-sm">
            <p className="text-muted-foreground">
              Total bayar:{' '}
              <span className="text-base font-extrabold text-primary">{formatRupiah(total)}</span>
            </p>
            {qrisReceiverName && (
              <p className="text-xs text-muted-foreground">Penerima: {qrisReceiverName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Pesanan <span className="font-mono font-bold">{orderToken}</span>
            </p>
          </div>

          {/* Download QR */}
          {qrisUrl && (
            <Button variant="outline" className="w-full" onClick={downloadQris}>
              <Download className="h-4 w-4" /> Download QR
            </Button>
          )}

          {/* Bukti transfer — WAJIB */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Scan QR di atas, bayar sesuai total, lalu WAJIB lampirkan bukti transfer.
              Tanpa bukti, pesanan tidak bisa diverifikasi.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {file && previewUrl ? (
              <div className="space-y-2 rounded-xl border border-border p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview bukti transfer"
                  className="mx-auto max-h-40 rounded-lg object-contain"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">{file.name}</p>
                  <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                    Ganti
                  </Button>
                </div>
              </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold transition-colors hover:bg-muted"
                >
                  <Upload className="h-4 w-4" /> Kirim Bukti Transfer (wajib)
                </button>
              )}

            <Button
              className="w-full"
              loading={submitting}
              disabled={!file}
              onClick={handleSubmitProof}
            >
              <CheckCircle2 className="h-4 w-4" /> Saya Sudah Bayar
            </Button>
            {!file && (
              <p className="text-center text-[11px] text-muted-foreground">
                Tombol aktif setelah bukti transfer dilampirkan.
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
