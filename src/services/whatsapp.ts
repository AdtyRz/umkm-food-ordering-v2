/**
 * WhatsAppService — abstraksi provider notifikasi WhatsApp.
 *
 * Development: WhatsAppMockProvider (tercatat di log server).
 * Production : FonnteProvider (atau provider lain — tinggal tambah adapter).
 * Credential di server-side env only (PRD §36, §84).
 */
import 'server-only';
import { formatRupiah, statusNotificationMessage } from '@/utils';
import { ORDER_STATUS_LABELS } from '@/constants';
import type { OrderStatus } from '@/types';

export interface WhatsAppProvider {
  readonly name: string;
  send(to: string, message: string): Promise<{ ok: boolean; error?: string }>;
}

// ============================================================
// MOCK PROVIDER (development)
// ============================================================
export class WhatsAppMockProvider implements WhatsAppProvider {
  readonly name = 'mock';
  async send(to: string, message: string) {
    console.log('\n========== [WhatsApp MOCK] ==========');
    console.log(`Kepada: ${to}`);
    console.log(message);
    console.log('=====================================\n');
    return { ok: true };
  }
}

// ============================================================
// FONNTE PROVIDER (production-ready adapter, aktif via env)
// ============================================================
export class FonnteProvider implements WhatsAppProvider {
  readonly name = 'fonnte';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async send(to: string, message: string) {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target: to, message }),
    });

    if (!res.ok) {
      return { ok: false, error: `Fonnte HTTP ${res.status}` };
    }
    const json = (await res.json().catch(() => ({}))) as { status?: boolean | string };
    if (json.status === false) {
      return { ok: false, error: 'Fonnte menolak pesan' };
    }
    return { ok: true };
  }
}

// ============================================================
// FACTORY
// ============================================================
function getProvider(): WhatsAppProvider {
  const providerName = (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase();
  const token = process.env.WHATSAPP_TOKEN;

  if (providerName === 'fonnte' && token) {
    return new FonnteProvider(token);
  }
  return new WhatsAppMockProvider();
}

/** Provider aktif — diekspos agar action lain bisa kirim pesan non-status. */
export function getWhatsAppProvider(): WhatsAppProvider {
  return getProvider();
}

/**
 * Kirim pesan BEBAS (bukan notifikasi status) ke nomor tujuan format +62.
 * Dipakai fitur "kirim pemberitahuan manual" admin saat bot nonaktif.
 * Best-effort: error tidak pernah melempar.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ ok: boolean; error?: string; provider: string }> {
  const normalized = to.replace(/^(\+62|62|0)/, '62').replace(/\D/g, '');
  if (!normalized || normalized.length < 10) {
    return { ok: false, error: 'Nomor tujuan tidak valid.', provider: '-' };
  }
  const provider = getProvider();
  const result = await provider.send(normalized, message);
  if (!result.ok) {
    console.error(`[whatsapp:${provider.name}] gagal kirim manual: ${result.error}`);
  }
  return { ...result, provider: provider.name };
}

// ============================================================
// PUBLIC API
// ============================================================
export type NotifyStatusInput = {
  orderToken: string;
  status: OrderStatus;
  customerName: string | null;
  phone: string | null;
  total: number;
  /** Token customer — disertakan di pesan WA sebagai pengingat simpan token. */
  customerToken?: string | null;
};

/**
 * Kirim notifikasi perubahan status. Best-effort: error tidak pernah
 * melempar ke caller (order tidak boleh gagal karena notifikasi).
 *
 * Bot-aware: bila admin menonaktifkan bot WA di panel Toko, notifikasi
 * otomatis DILEWATI (dikembalikan status 'bot_disabled') — admin lalu
 * memakai tombol "Kirim Pemberitahuan" (kirim manual) di halaman pesanan.
 */
export async function notifyOrderStatus(input: NotifyStatusInput): Promise<{
  ok: boolean;
  skipped?: 'bot_disabled' | 'no_phone';
}> {
  const { getWhatsAppConfig } = await import('./store');
  const config = await getWhatsAppConfig();
  if (!config.botEnabled) {
    console.info('[whatsapp] bot nonaktif — notifikasi otomatis dilewati (pakai kirim manual)');
    return { ok: false, skipped: 'bot_disabled' };
  }

  if (!input.phone) {
    console.warn('[whatsapp] nomor customer kosong, notifikasi dilewati');
    return { ok: false, skipped: 'no_phone' };
  }

  // Normalisasi ke format internasional tanpa '+'
  const to = input.phone.replace(/^(\+62|62|0)/, '62');

  const message = statusNotificationMessage(input.status, {
    customerName: input.customerName,
    orderToken: input.orderToken,
    total: input.total,
    customerToken: input.customerToken ?? null,
  });

  const provider = getProvider();
  const result = await provider.send(to, message);
  if (!result.ok) {
    console.error(`[whatsapp:${provider.name}] gagal: ${result.error}`);
  }
  return { ok: result.ok };
}

/** Pesan untuk notifikasi status (diekspos untuk testing). */
export function buildStatusMessage(input: NotifyStatusInput): string {
  return statusNotificationMessage(input.status, {
    customerName: input.customerName,
    orderToken: input.orderToken,
    total: input.total,
    customerToken: input.customerToken ?? null,
  });
}

// re-export agar pemakaian lama tetap jalan
export { ORDER_STATUS_LABELS };
