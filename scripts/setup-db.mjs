/**
 * Setup database development (MySQL/MariaDB via XAMPP).
 *
 *   node scripts/setup-db.mjs
 *
 * Langkah:
 *   1. Buat database (jika belum ada)
 *   tanpa 2. Jalankan seluruh file di db/migrations secara urut
 *   3. Buat akun admin awal (email & password dari .env.local)
 *
 * Idempotent: aman dijalankan berulang.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { loadEnvLocal } from './lib/env.mjs';

const env = loadEnvLocal();

const DB_HOST = env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(env.DB_PORT || 3306);
const DB_USER = env.DB_USER || 'root';
const DB_PASSWORD = env.DB_PASSWORD || '';
const DB_NAME = env.DB_NAME || 'umkm_food_ordering';
const ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@kedairasa.id';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = env.ADMIN_NAME || 'Admin Kedai Rasa';

const migrationsDir = join(process.cwd(), 'db', 'migrations');

function log(msg) {
  console.log(`[setup-db] ${msg}`);
}

async function main() {
  log(`Menyambung ke MySQL di ${DB_HOST}:${DB_PORT} sebagai ${DB_USER}...`);

  const server = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  // 1. Buat database jika belum ada
  await server.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  log(`Database "${DB_NAME}" siap.`);

  await server.query(`USE \`${DB_NAME}\``);

  // 2. Jalankan migrasi secara urut
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    try {
      await server.query(sql);
      log(`Migrasi OK: ${file}`);
    } catch (err) {
      // Seed idempotent: duplikat entry diabaikan
      if (err.code === 'ER_DUP_ENTRY') {
        log(`Migrasi (data sudah ada, dilewati): ${file}`);
        continue;
      }
      throw err;
    }
  }

  // 3. Admin awal
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await server.execute(
    `INSERT INTO admin_users (id, email, password_hash, name, role)
     VALUES (?, ?, ?, ?, 'owner')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    [randomUUID(), ADMIN_EMAIL, hash, ADMIN_NAME]
  );
  log(`Admin siap: ${ADMIN_EMAIL} (password dari ADMIN_PASSWORD di .env.local)`);

  // 4. Ringkasan
  const [tables] = await server.query('SHOW TABLES');
  log(`Tabel: ${tables.map((r) => Object.values(r)[0]).join(', ')}`);

  await server.end();
  log('Selesai! ✅');
}

main().catch((err) => {
  console.error('[setup-db] GAGAL:', err.message);
  console.error(
    err.code === 'ECONNREFUSED'
      ? '→ Pastikan MySQL di XAMPP sudah berjalan (start MySQL di XAMPP Control Panel).'
      : ''
  );
  process.exit(1);
});
