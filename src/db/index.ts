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

const client = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });
export { schema };
