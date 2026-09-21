'use server';

import {
  createCustomerSession,
  setSessionCookie,
  validateCustomerSessionByToken,
} from '@/services/customer-session';

export type SessionResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/** Buat session customer baru + set cookie. */
export async function createSessionAction(): Promise<SessionResult> {
  try {
    const session = await createCustomerSession();
    await setSessionCookie(session.customerToken, session.expiresAt);
    return { ok: true, token: session.customerToken };
  } catch (err) {
    console.error('[createSessionAction]', err);
    return { ok: false, error: 'Gagal membuat sesi. Silakan coba lagi.' };
  }
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
