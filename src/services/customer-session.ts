/**
 * CustomerSessionService — identitas customer tanpa akun.
 *
 * Model keamanan:
 *   * Token mentah HANYA dikirim ke client sekali via cookie httpOnly.
 *   * Database menyimpan SHA-256 hash saja.
 *   * Validasi selalu di server.
 *   * session_id (UUID) disertakan pada JWT realtime agar customer
 *     hanya bisa subscribe pesanan miliknya sendiri.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { SignJWT } from 'jose';
import { db } from '@/db';
import { customerSessions, customers } from '@/db/schema';
import { isValidCustomerTokenFormat } from '@/utils';
import { generateCustomerToken, hashToken } from '@/lib/token';

const SESSION_COOKIE = 'umkm_session';
const REALTIME_JWT_TTL = '12h';
const REALTIME_TTL_IF_DEFINED: string | null = null;

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET belum diset / terlalu pendek (min 32 karakter) di .env.local'
    );
  }
  return new TextEncoder().encode(secret);
}

// ============================================================
// SESSION LIFECYCLE
// ============================================================
function sessionExpiry(): Date {
  const days = Number(process.env.CUSTOMER_SESSION_DAYS || 14);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export type CustomerSessionData = {
  sessionId: string;
  customerId: string;
  customerToken: string; // raw, hanya ada di memori server
  expiresAt: Date;
};

/**
 * Buat customer + session baru. Token baru dijamin unik di DB
 * (hash unique) — retry bila tabrakan (sangat kecil kemungkinannya).
 */
export async function createCustomerSession(): Promise<CustomerSessionData> {
  // mysql2 tidak mengembalikan row hasil insert → kita tentukan id sendiri.
  const customerId = crypto.randomUUID();
  await db.insert(customers).values({ id: customerId });
  return createSessionForCustomer(customerId);
}

async function createSessionForCustomer(
  customerId: string
): Promise<CustomerSessionData> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateCustomerToken();
    const tokenHash = hashToken(token);
    const sessionId = randomUUID();
    const expiresAt = sessionExpiry();
    try {
      // Catatan: driver mysql2 tidak mendukung .returning(),
      // jadi nilai dikembalikan dari variabel yang kita insert.
      await db.insert(customerSessions).values({
        customerId,
        sessionId,
        customerTokenHash: tokenHash,
        expiresAt,
      });
      return {
        sessionId,
        customerId,
        customerToken: token,
        expiresAt,
      };
    } catch (err) {
      if (attempt === 4) throw err;
      // duplicate hash (sangat jarang) → coba lagi
    }
  }
  throw new Error('Gagal membuat session customer');
}

/** Simpan token ke cookie httpOnly. */
export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Validasi token (dari cookie atau input user) → data session aktif.
 * Token di-hash lalu dicocokkan ke DB; session kadaluarsa ditolak.
 */
export async function validateCustomerSessionByToken(
  rawToken: string
): Promise<CustomerSessionData | null> {
  if (!isValidCustomerTokenFormat(rawToken)) return null;

  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select({
      sessionId: customerSessions.sessionId,
      customerId: customerSessions.customerId,
      expiresAt: customerSessions.expiresAt,
    })
    .from(customerSessions)
    .where(
      and(
        eq(customerSessions.customerTokenHash, tokenHash),
        gt(customerSessions.expiresAt, new Date()),
        // Session hangus (pesanan selesai / dicabut) tidak bisa dipakai lagi.
        isNull(customerSessions.revokedAt)
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    sessionId: row.sessionId,
    customerId: row.customerId,
    customerToken: rawToken.trim().toUpperCase(),
    expiresAt: row.expiresAt,
  };
}

/** Ambil session dari cookie (dipakai server-side di semua halaman customer). */
export async function getCustomerSession(): Promise<CustomerSessionData | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateCustomerSessionByToken(token);
}

/** Perbarui last_activity_at session (dipanggil saat aktivitas penting). */
export async function touchSession(sessionId: string) {
  await db
    .update(customerSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(customerSessions.sessionId, sessionId));
}

/**
 * Hanguskan session: token tidak bisa dipakai lagi, cookie dibersihkan,
 * dan customer menerima event realtime `session.revoked` sebelum koneksi
 * SSE ditutup. Dipanggil saat pesanan terakhir dicap selesai.
 */
export async function revokeCustomerSession(sessionId: string): Promise<boolean> {
  const result = await db
    .update(customerSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(customerSessions.sessionId, sessionId), isNull(customerSessions.revokedAt))
    );
  // mysql2: hasil update = [ResultSetHeader, FieldPacket[]].
  const header = (Array.isArray(result) ? result[0] : result) as
    | { affectedRows?: number; rowsAffected?: number }
    | undefined;
  const affected = header?.affectedRows ?? header?.rowsAffected ?? 1;
  if (affected <= 0) return false;

  // Cookie di browser pemanggil dihapus best-effort. Browser customer
  // tetap aman: validasi server menolak session yang sudah revoked.
  clearSessionCookie().catch(() => {});
  const { publishRealtimeEvent } = await import('./realtime');
  publishRealtimeEvent({
    topic: `order:${sessionId}`,
    type: 'session.revoked',
    payload: { reason: 'completed' },
  });
  return true;
}

// ============================================================
// REALTIME JWT (klaim: session_id)
// ============================================================
export async function createRealtimeJWT(sessionId: string): Promise<string> {
  return new SignJWT({ session_id: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('umkm-food-ordering')
    .setAudience('supabase-realtime')
    .setExpirationTime(REALTIME_JWT_TTL)
    .sign(getAuthSecret());
}

/**
 * Catatan deploy (Supabase):
 * Saat migrasi ke Supabase, JWT ini ditandatangani dengan Supabase JWT
 * Secret sehingga policy RLS `order_session_matches(session_id)` dapat
 * membaca klaim `app_metadata.session_id`. Lihat README bagian Migrasi.
 */
