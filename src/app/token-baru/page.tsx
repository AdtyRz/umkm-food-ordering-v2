import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/services/customer-session';
import { TokenReveal } from './token-reveal';

export const metadata: Metadata = { title: 'Token Kamu' };

export const dynamic = 'force-dynamic';

/**
 * Halaman penampil token yang baru dibuat.
 *
 * Token raw tersimpan di cookie httpOnly (diset saat server action
 * createSessionAction), jadi halaman ini cukup membaca session aktif —
 * token tidak pernah lewat URL sehingga tidak bocor ke history/share.
 * Halaman stabil: tanpa timer, tanpa redirect otomatis. Token tetap
 * terlihat sampai customer menekan "Lanjut ke Menu".
 */
export default async function TokenBaruPage() {
  const session = await getCustomerSession();
  if (!session) redirect('/');

  return <TokenReveal token={session.customerToken} />;
}
