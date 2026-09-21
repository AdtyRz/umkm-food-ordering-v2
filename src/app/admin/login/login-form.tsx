'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import { Button, Input, Label, FieldError } from '@/components/ui';
import { loginAction } from '../actions';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (res.ok) {
        router.push('/admin/dashboard');
        router.refresh();
      } else {
        setError(res.error ?? 'Login gagal');
      }
    });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-md animate-scale-in"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold">Admin Kedai Rasa</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengelola toko</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email" required>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@kedairasa.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" required>Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <FieldError message={error} />
          <Button type="submit" className="w-full" loading={pending}>
            <LogIn className="h-4 w-4" /> Masuk
          </Button>
        </div>
      </form>
    </main>
  );
}
