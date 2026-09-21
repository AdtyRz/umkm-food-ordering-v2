'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Save, UserCog } from 'lucide-react';
import { Button, Card, Input, Label, useToast } from '@/components/ui';
import {
  updateAdminProfileAction,
  changeAdminPasswordAction,
} from '../../actions';

export function AccountSettingsClient({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();

  // ---------- Profil ----------
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [profileError, setProfileError] = useState<string | null>(null);

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    startTransition(async () => {
      const res = await updateAdminProfileAction({ name, email });
      if (res.ok) {
        push('Profil berhasil diperbarui', 'success');
        router.refresh();
      } else {
        setProfileError(res.error ?? 'Gagal menyimpan profil');
      }
    });
  };

  // ---------- Password ----------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    startTransition(async () => {
      const res = await changeAdminPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (res.ok) {
        push('Password berhasil diganti', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.error ?? 'Gagal mengganti password');
      }
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {/* Profil */}
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <UserCog className="h-4 w-4 text-primary" /> Profil Admin
        </h2>
        <form onSubmit={submitProfile} className="space-y-3">
          <div>
            <Label htmlFor="acc-name">Nama</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama yang tampil di dashboard"
              maxLength={120}
              required
            />
          </div>
          <div>
            <Label htmlFor="acc-email">Email</Label>
            <Input
              id="acc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email untuk login"
              maxLength={255}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Email ini dipakai untuk login. Pastikan mudah kamu ingat.
            </p>
          </div>
          {profileError && (
            <p className="rounded-xl bg-destructive-soft px-3 py-2 text-xs font-semibold text-destructive">
              {profileError}
            </p>
          )}
          <Button type="submit" loading={pending} className="w-full">
            <Save className="h-4 w-4" /> Simpan Profil
          </Button>
        </form>
      </Card>

      {/* Password */}
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <KeyRound className="h-4 w-4 text-primary" /> Ganti Password
        </h2>
        <form onSubmit={submitPassword} className="space-y-3">
          <div>
            <Label htmlFor="acc-pass-current">Password Saat Ini</Label>
            <Input
              id="acc-pass-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="acc-pass-new">Password Baru</Label>
            <Input
              id="acc-pass-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Minimal 8 karakter, kombinasi huruf dan angka.
            </p>
          </div>
          <div>
            <Label htmlFor="acc-pass-confirm">Konfirmasi Password Baru</Label>
            <Input
              id="acc-pass-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {passwordError && (
            <p className="rounded-xl bg-destructive-soft px-3 py-2 text-xs font-semibold text-destructive">
              {passwordError}
            </p>
          )}
          <Button type="submit" loading={pending} className="w-full">
            <KeyRound className="h-4 w-4" /> Ganti Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
