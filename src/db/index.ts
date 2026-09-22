import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Singleton pattern agar tidak membuat koneksi berulang saat hot-reload di Next.js dev mode
const globalForDb = globalThis as unknown as {
  conn?: postgres.Sql;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL belum diatur di environment variable');
}

// prepare: false — WAJIB untuk Supabase Pooler (PgBouncer transaction mode,
// port 6543): prepared statement tersimpan per koneksi server, sedangkan
// transaction mode membagikan koneksi server tiap query → error intermiten
// "prepared statement ... does not exist" pada query Promise.all paralel.
const client = globalForDb.conn ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });
export { schema };
