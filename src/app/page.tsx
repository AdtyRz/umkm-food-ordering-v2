import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/services/customer-session';
import { TokenGate } from './token-gate';

export default async function HomePage() {
  const session = await getCustomerSession();
  if (session) redirect('/menu');
  return <TokenGate />;
}
