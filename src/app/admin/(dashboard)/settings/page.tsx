import { getAdminSession } from '@/services/admin-auth';
import { AccountSettingsClient } from './settings-client';

export const metadata = { title: 'Pengaturan' };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = await getAdminSession();
  if (!admin) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola akun admin: nama, email, dan password.
        </p>
      </div>

      <AccountSettingsClient initialName={admin.name} initialEmail={admin.email} />
    </div>
  );
}
