'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, KeyRound, Sparkles, Ticket } from 'lucide-react';
import { Button, useToast } from '@/components/ui';

/**
 * Tampilan "tiket" token yang baru dibuat. Halaman ini stabil — tidak
 * ada redirect otomatis, tidak ada timer. Token tetap terlihat sampai
 * customer menekan "Lanjut ke Menu".
 */
export function TokenReveal({ token }: { token: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      push('Token disalin!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API bisa gagal (http, permission) — tetap kasih feedback.
      push('Gagal menyalin. Salin manual ya.', 'error');
    }
  };

  const handleContinue = () => router.push('/menu');

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-lg animate-scale-in">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          <Ticket className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-extrabold">Token Kamu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Simpan token ini untuk melihat pesanan kamu dari perangkat lain.
        </p>

        <div className="my-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/50 px-4 py-4">
          <p className="font-mono text-2xl font-bold tracking-widest text-primary select-all break-all">
            {token || '—'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleCopy} variant="secondary">
            <Copy className="h-4 w-4" /> {copied ? 'Tersalin!' : 'Salin Token'}
          </Button>
          <Button onClick={handleContinue}>
            Lanjut ke Menu <Sparkles className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5" />
          Kalau token hilang, kamu bisa masuk ulang lewat menu utama.
        </p>
      </div>
    </main>
  );
}
