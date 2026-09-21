import { getCustomerSession } from '@/services/customer-session';
import { getAvailableProducts, getActiveCategories } from '@/services/catalog';
import { getStoreInfo, getStoreOpenStatus } from '@/services/store';
import { MenuClient } from './menu-client';

export const metadata = { title: 'Menu' };

export default async function MenuPage() {
  const [session, store, status, categories, products] = await Promise.all([
    getCustomerSession(),
    getStoreInfo(),
    getStoreOpenStatus(),
    getActiveCategories(),
    getAvailableProducts(),
  ]);

  if (!store || !status) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-semibold">Toko belum dikonfigurasi.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Jalankan <code>node scripts/setup-db.mjs</code> untuk seed data awal.
        </p>
      </div>
    );
  }

  return (
    <MenuClient
      store={store}
      status={status}
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      products={products}
      sessionToken={session?.customerToken ?? ''}
    />
  );
}
