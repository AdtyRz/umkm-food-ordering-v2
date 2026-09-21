/**
 * AdminAuthService — login admin via email+password (bcrypt),
 * session JWT di cookie httpOnly. Saat migrasi ke Supabase, service ini
 * diganti Supabase Auth tanpa mengubah halaman admin.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import type { AdminLoginInput } from '@/lib/validations';

const COOKIE = 'umkm_admin';
const TTL_SECONDS = 60 * 60 * 12; // 12 jam

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET belum diset / terlalu pendek (min 32 karakter)');
  }
  return new TextEncoder().encode(secret);
}

export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  role: string;
};

// ============================================================
// LOGIN RATE LIMIT (brute-force mitigation, in-memory)
// ============================================================
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 menit
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

export function clearLoginRateLimit(key: string) {
  loginAttempts.delete(key);
}

/**
 * Verifikasi kredensial → buat JWT → set cookie httpOnly.
 * Dibatasi 5 percobaan / 15 menit per email+IP (anti brute-force).
 */
export async function loginAdmin(
  input: AdminLoginInput,
  opts?: { rateLimitKey?: string }
): Promise<AdminIdentity> {
  const key = opts?.rateLimitKey ?? input.email.toLowerCase();
  if (!checkLoginRateLimit(key)) {
    throw new Error('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  }

  const email = input.email.toLowerCase();
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  // Bandingkan terhadap hash dummy agar timing stabil untuk email tak dikenal
  const hash =
    user?.passwordHash ??
    '$2a$12$C6UzMDM.H6dfI/f/IKcEeO1qGmHVoNDZkKqmxqjHkbL2sFhZ.N6fi';
  const ok = await bcrypt.compare(input.password, hash);
  if (!user || !ok) {
    throw new Error('Email atau password salah');
  }
  clearLoginRateLimit(key);

  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_SECONDS,
    path: '/',
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function logoutAdmin() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Ambil admin dari JWT cookie. Null jika tidak login / token invalid. */
export async function getAdminSession(): Promise<AdminIdentity | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: String(payload.role ?? 'admin'),
    };
  } catch {
    return null;
  }
}

/** Untuk server actions admin: lempar error jika bukan admin. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getAdminSession();
  if (!admin) {
    throw new Error('UNAUTHORIZED');
  }
  return admin;
}

// ============================================================
// ACCOUNT SETTINGS (halaman /admin/settings)
// ============================================================

/**
 * Perbarui nama & email admin yang sedang login.
 * Email dijamin unik; setelah berhasil, JWT cookie diperbarui agar
 * payload (nama/email) ikut terbarui.
 */
export async function updateAdminProfile(
  admin: AdminIdentity,
  input: { name: string; email: string }
): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.toLowerCase();
  if (email !== admin.email) {
    const [dup] = await db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);
    if (dup && dup.id !== admin.id) {
      return { ok: false, error: 'Email sudah dipakai akun lain' };
    }
  }

  await db
    .update(adminUsers)
    .set({ name: input.name, email })
    .where(eq(adminUsers.id, admin.id));

  // Refresh cookie JWT agar payload terbaru (nama/email) langsung aktif.
  const token = await new SignJWT({
    sub: admin.id,
    email,
    name: input.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_SECONDS,
    path: '/',
  });

  return { ok: true };
}

/**
 * Ganti password: verifikasi password lama dulu (bcrypt), lalu simpan
 * hash baru. Sesi tetap berlaku sampai kadaluarsa normal.
 */
export async function changeAdminPassword(
  admin: AdminIdentity,
  input: { currentPassword: string; newPassword: string }
): Promise<{ ok: boolean; error?: string }> {
  const [user] = await db
    .select({ passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, admin.id))
    .limit(1);
  if (!user) return { ok: false, error: 'Akun tidak ditemukan' };

  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, error: 'Password saat ini salah' };

  const newHash = await bcrypt.hash(input.newPassword, 12);
  await db
    .update(adminUsers)
    .set({ passwordHash: newHash })
    .where(eq(adminUsers.id, admin.id));

  return { ok: true };
}
