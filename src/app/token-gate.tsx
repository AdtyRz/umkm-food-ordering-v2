'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, KeyRound, Sparkles } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';
import { createSessionAction, restoreSessionAction } from '@/app/actions/session';

export function TokenGate() {
  const router = useRouter();
  const { push } = useToast();
  const [mode, setMode] = useState<'new' | 'restore' | 'show'>('new');
  const [token, setToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  const handleCreate = () => {
    setCreating(true);
    setError(null);
    startTransition(async () => {
      const res = await createSessionAction();
      setCreating(false);
      if (res.ok) {
        setToken(res.token);
        setMode('show');
      } else {
        setError(res.error);
      }
    });
  };

  const handleRestore = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await restoreSessionAction(inputToken);
      if (res.ok) {
        router.push('/menu');
      } else {
        setError(res.error);
      }
    });
  };

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      push('Token disalin!', 'success');
    } catch {
      push('Gagal menyalin. Salin manual ya.', 'error');
    }
  };

  const handleContinue = () => router.push('/menu');

  // ---------- TAMPILAN TOKEN BARU ----------
  if (mode === 'show' && token) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-lg animate-scale-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-3xl" aria-hidden>
            🎫
          </div>
          <h1 className="text-xl font-extrabold">Token Kamu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simpan token ini untuk melihat pesanan kamu di lain waktu.
          </p>
          <div className="my-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/50 px-4 py-4">
            <p className="font-mono text-2xl font-bold tracking-widest text-primary select-all">
              {token}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleCopy} variant="secondary">
              <Copy className="h-4 w-4" /> Salin Token
            </Button>
            <Button onClick={handleContinue}>
              Lanjutkan <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // ---------- TAMPILAN AWAL ----------
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl shadow-lg shadow-orange-500/30" aria-hidden>
          🍜
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Kedai Rasa</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Pesan makanan favoritmu <b>tanpa daftar akun</b> — cukup pakai token!
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3 animate-fade-in">
        {mode === 'new' ? (
          <>
            <Button size="lg" className="w-full" loading={creating || pending} onClick={handleCreate}>
              <Sparkles className="h-5 w-5" /> Buat Token Baru
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMode('restore')}
            >
              <KeyRound className="h-4 w-4" /> Sudah punya token?
            </Button>
          </>
        ) : (
          <form onSubmit={handleRestore} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <label htmlFor="token" className="mb-1.5 block text-sm font-medium">
              Masukkan token kamu
            </label>
            <Input
              id="token"
              placeholder="UMKM-XXXXX-XXXXX"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-widest"
              required
            />
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Button type="submit" className="flex-1" loading={pending}>
                Masuk
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode('new')}>
                Batal
              </Button>
            </div>
          </form>
        )}

        {mode === 'new' && error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Dengan melanjutkan, kamu dianggap setuju dengan ketentuan pemesanan kami.
      </p>
    </main>
  );
}
