'use server';

import { redirect } from 'next/navigation';
import {
  createCustomerSession,
  setSessionCookie,
  validateCustomerSessionByToken,
} from '@/services/customer-session';

export type SessionResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * Buat session customer baru + set cookie, lalu redirect ke halaman
 * /token-baru yang menampilkan token.
 *
 * Redirect dilakukan DI DALAM server action (bukan lewat router.push di
 * client setelahnya). Kalau tidak, selesainya action memicu refresh RSC
 * halaman `/` → HomePage mendeteksi session aktif → redirect('/menu')
 * menimpa tampilan token sebelum customer sempat membacanya.
 *
 * redirect() melempar error khusus NEXT_REDIRECT — itulah sebabnya
 * dipanggil DI LUAR blok try/catch.
 */
export async function createSessionAction(): Promise<SessionResult> {
  let token: string;
  try {
    const session = await createCustomerSession();
    await setSessionCookie(session.customerToken, session.expiresAt);
    token = session.customerToken;
  } catch (err) {
    console.error('[createSessionAction]', err);
    return { ok: false, error: 'Gagal membuat sesi. Silakan coba lagi.' };
  }
  // Token raw tersimpan di cookie httpOnly — halaman /token-baru
  // membacanya dari cookie, jadi tidak perlu lewat URL.
  redirect('/token-baru');
}

/** Restore session dari token yang diketik customer. */
export async function restoreSessionAction(token: string): Promise<SessionResult> {
  try {
    const session = await validateCustomerSessionByToken(token);
    if (!session) {
      return {
        ok: false,
        error: 'Token tidak valid atau sudah kedaluwarsa. Coba periksa lagi.',
      };
    }
    await setSessionCookie(session.customerToken, session.expiresAt);
    return { ok: true, token: session.customerToken };
  } catch (err) {
    console.error('[restoreSessionAction]', err);
    return { ok: false, error: 'Koneksi bermasalah. Silakan coba lagi.' };
  }
}
