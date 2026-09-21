/**
 * CatalogService — kategori & produk (baca publik + CRUD admin).
 */
import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { categories, products } from '@/db/schema';
import { slugify } from '@/utils';
import type { ProductWithCategory, StockStatus } from '@/types';

// ============================================================
// PUBLIC
// ============================================================
export async function getActiveCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getAvailableProducts(): Promise<ProductWithCategory[]> {
  const rows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      imagePath: products.imagePath,
      stockStatus: products.stockStatus,
      isAvailable: products.isAvailable,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isAvailable, true))
    .orderBy(asc(products.name));

  return rows.map((r) => ({ ...r, price: Number(r.price) }));
}

/** Semua produk termasuk nonaktif (untuk admin). */
export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const rows = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      imagePath: products.imagePath,
      stockStatus: products.stockStatus,
      isAvailable: products.isAvailable,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(asc(products.name));

  return rows.map((r) => ({ ...r, price: Number(r.price) }));
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const [row] = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      name: products.name,
      slug: products.slug,
      description: products.description,
      price: products.price,
      imagePath: products.imagePath,
      stockStatus: products.stockStatus,
      isAvailable: products.isAvailable,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1);

  return row ? { ...row, price: Number(row.price) } : null;
}

// ============================================================
// ADMIN CRUD
// ============================================================
async function uniqueSlug(
  base: string,
  table: typeof products | typeof categories,
  excludeId?: string
): Promise<string> {
  const slug = slugify(base) || 'item';
  let candidate = slug;
  let n = 2;
  // Loop kecil — jumlah slug collision sangat jarang
  for (;;) {
    const existing = await db.select({ id: table.id }).from(table).where(eq(table.slug, candidate)).limit(1);
    if (existing.length === 0 || existing[0].id === excludeId) return candidate;
    candidate = `${slug}-${n++}`;
  }
}

export async function createProduct(input: {
  name: string;
  description?: string | null;
  price: number;
  categoryId?: string | null;
  stockStatus: StockStatus;
  isAvailable: boolean;
  imagePath?: string | null;
}): Promise<string> {
  const slug = await uniqueSlug(input.name, products);
  const id = crypto.randomUUID();
  await db.insert(products).values({
    id,
    name: input.name,
    slug,
    description: input.description || null,
    price: String(input.price),
    categoryId: input.categoryId || null,
    stockStatus: input.stockStatus,
    isAvailable: input.isAvailable,
    imagePath: input.imagePath || null,
  });
  return id;
}

export async function updateProduct(
  id: string,
  input: {
    name: string;
    description?: string | null;
    price: number;
    categoryId?: string | null;
    stockStatus: StockStatus;
    isAvailable: boolean;
    imagePath?: string | null;
  }
) {
  const slug = await uniqueSlug(input.name, products, id);
  await db
    .update(products)
    .set({
      name: input.name,
      slug,
      description: input.description || null,
      price: String(input.price),
      categoryId: input.categoryId || null,
      stockStatus: input.stockStatus,
      isAvailable: input.isAvailable,
      imagePath: input.imagePath ?? null,
    })
    .where(eq(products.id, id));

  // Beritahu customer bila availability berubah
  const { publishRealtimeEvent } = await import('./realtime');
  publishRealtimeEvent({
    topic: 'products',
    type: 'product.changed',
    payload: {
      productId: id,
      stockStatus: input.stockStatus,
      isAvailable: input.isAvailable,
      name: input.name,
    },
  });
}

export async function setProductAvailability(
  id: string,
  stockStatus: StockStatus,
  isAvailable: boolean
) {
  const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, id)).limit(1);
  await db
    .update(products)
    .set({ stockStatus, isAvailable })
    .where(eq(products.id, id));

  const { publishRealtimeEvent } = await import('./realtime');
  publishRealtimeEvent({
    topic: 'products',
    type: 'product.changed',
    payload: {
      productId: id,
      stockStatus,
      isAvailable,
      name: product?.name ?? '',
    },
  });
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id));
}

// ---------- KATEGORI ----------
export async function createCategory(input: {
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}): Promise<string> {
  const slug = await uniqueSlug(input.name, categories);
  const id = crypto.randomUUID();
  await db.insert(categories).values({
    id,
    name: input.name,
    slug,
    description: input.description || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });
  return id;
}

export async function updateCategory(
  id: string,
  input: {
    name: string;
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
  }
) {
  const slug = await uniqueSlug(input.name, categories, id);
  await db
    .update(categories)
    .set({
      name: input.name,
      slug,
      description: input.description || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    })
    .where(eq(categories.id, id));
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id));
}
