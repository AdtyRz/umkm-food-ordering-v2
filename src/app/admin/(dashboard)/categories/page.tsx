import { getAllCategories } from '@/services/catalog';
import { CategoriesClient } from './categories-client';

export const metadata = { title: 'Kategori' };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await getAllCategories();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Kategori</h1>
        <p className="text-sm text-muted-foreground">Kelola kategori menu.</p>
      </div>
      <CategoriesClient
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? '',
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        }))}
      />
    </div>
  );
}
