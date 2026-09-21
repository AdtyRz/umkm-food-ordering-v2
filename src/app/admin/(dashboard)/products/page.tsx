import { getAllProducts, getAllCategories } from '@/services/catalog';
import { ProductsClient } from './products-client';

export const metadata = { title: 'Produk' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Produk</h1>
        <p className="text-sm text-muted-foreground">Kelola menu makanan & minuman.</p>
      </div>
      <ProductsClient
        products={products}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
