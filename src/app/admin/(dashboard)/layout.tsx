import { redirect } from 'next/navigation';
import { getAdminSession } from '@/services/admin-auth';
import { AdminShell } from '../admin-shell';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  return <AdminShell adminName={admin.name}>{children}</AdminShell>;
}
