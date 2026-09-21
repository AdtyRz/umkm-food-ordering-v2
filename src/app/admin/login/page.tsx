import { redirect } from 'next/navigation';
import { getAdminSession } from '@/services/admin-auth';
import { LoginForm } from './login-form';

export const metadata = { title: 'Login Admin' };

export default async function AdminLoginPage() {
  const admin = await getAdminSession();
  if (admin) redirect('/admin/dashboard');
  return <LoginForm />;
}
