/**
 * AdminAuthService — login admin via Supabase Auth + adminProfiles,
 * session JWT di cookie httpOnly.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/db';
import { adminProfiles } from '@/db/schema';
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

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset di .env');
  }
  return createClient(url, key);
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase URL atau Key belum dikonfigurasi');
  }
  return createClient(url, serviceKey);
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
 * Verifikasi kredensial via Supabase Auth → buat JWT → set cookie httpOnly.
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
  const supabase = getSupabaseClient();

  // Login menggunakan Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error || !data.user) {
    throw new Error('Email atau password salah');
  }

  clearLoginRateLimit(key);

  // Ambil profil admin dari tabel admin_profiles
  const [profile] = await db
  .select()
  .from(adminProfiles)
  .where(eq(adminProfiles.userId, data.user.id))
  .limit(1);

  const name = profile?.name ?? data.user.user_metadata?.name ?? 'Admin';
  const role = profile?.role ?? 'admin';

  const token = await new SignJWT({
    sub: data.user.id,
    email: data.user.email ?? email,
    name,
    role,
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

  return {
    id: data.user.id,
    email: data.user.email ?? email,
    name,
    role,
  };
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
 * Perbarui nama & email admin.
 */
export async function updateAdminProfile(
  admin: AdminIdentity,
  input: { name: string; email: string }
): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.toLowerCase();

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Update email di Supabase Auth jika berubah
    if (email !== admin.email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        admin.id,
        { email }
      );
      if (authError) {
        return { ok: false, error: authError.message };
      }
    }

    // Update nama di admin_profiles (Drizzle)
    await db
    .update(adminProfiles)
    .set({ name: input.name, updatedAt: new Date() })
    .where(eq(adminProfiles.userId, admin.id));

    // Refresh cookie JWT agar payload terbaru langsung aktif
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui profil';
    return { ok: false, error: message };
  }
}

/**
 * Ganti password admin via Supabase Auth.
 */
export async function changeAdminPassword(
  admin: AdminIdentity,
  input: { currentPassword: string; newPassword: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // Verifikasi password lama dengan re-login
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: admin.email,
      password: input.currentPassword,
    });

    if (verifyError) {
      return { ok: false, error: 'Password saat ini salah' };
    }

    // Update password baru via Supabase Auth
    const supabaseAdmin = getSupabaseAdminClient();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      admin.id,
      { password: input.newPassword }
    );

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal mengubah password';
    return { ok: false, error: message };
  }
}
