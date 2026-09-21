/**
 * Koneksi database MySQL via mysql2 pool + Drizzle.
 * Dipakai di server-side saja (Server Components, Server Actions, Route Handlers).
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL;
  if (url) {
    return mysql.createPool({
      uri: url,
      connectionLimit: 10,
      timezone: 'Z',
      supportBigNumbers: true,
    });
  }
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'umkm_food_ordering',
    connectionLimit: 10,
    timezone: 'Z',
    supportBigNumbers: true,
  });
}

export const pool = globalForDb.mysqlPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = pool;
}

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
