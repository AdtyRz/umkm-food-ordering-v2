import { redirect } from 'next/navigation';
import { getCustomerSession } from '@/services/customer-session';
import { BottomNav } from '@/components/domain/bottom-nav';
import { CartProvider } from '@/hooks/use-cart';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();
  if (!session) redirect('/');

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-24 pt-4">
      {children}
      <BottomNav />
    </div>
  );
}
