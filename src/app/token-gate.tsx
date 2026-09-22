'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { KeyRound, Sparkles } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { createSessionAction, restoreSessionAction } from '@/app/actions/session';
import logo from '@/logo/logo.png';

export function TokenGate() {
  const router = useRouter();
  const [mode, setMode] = useState<'new' | 'restore'>('new');
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);

  // Sukses → server action me-redirect ke /token-baru (halaman yang
  // menampilkan token + tombol salin). Gagal → tampilkan error di sini.
  const handleCreate = () => {
    setCreating(true);
    setError(null);
    startTransition(async () => {
      const res = await createSessionAction();
      setCreating(false);
      if (!res.ok) setError(res.error);
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

  // ---------- TAMPILAN AWAL ----------
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center animate-fade-in">
        <Image
          src={logo}
          alt="Logo Kedai Rasa"
          width={80}
          height={80}
          priority
          className="mx-auto mb-4 h-20 w-20 rounded-3xl object-cover shadow-lg shadow-orange-500/30"
        />
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
