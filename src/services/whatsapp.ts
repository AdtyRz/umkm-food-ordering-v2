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

// ============================================================
// PUBLIC API
// ============================================================
export type NotifyStatusInput = {
  orderToken: string;
  status: OrderStatus;
  customerName: string | null;
  phone: string | null;
  total: number;
};

/**
 * Kirim notifikasi perubahan status. Best-effort: error tidak pernah
 * melempar ke caller (order tidak boleh gagal karena notifikasi).
 */
export async function notifyOrderStatus(input: NotifyStatusInput): Promise<void> {
  if (!input.phone) {
    console.warn('[whatsapp] nomor customer kosong, notifikasi dilewati');
    return;
  }

  // Normalisasi ke format internasional tanpa '+'
  const to = input.phone.replace(/^(\+62|62|0)/, '62');

  const message = statusNotificationMessage(input.status, {
    customerName: input.customerName,
    orderToken: input.orderToken,
    total: input.total,
  });

  const provider = getProvider();
  const result = await provider.send(to, message);
  if (!result.ok) {
    console.error(`[whatsapp:${provider.name}] gagal: ${result.error}`);
  }
}

/** Pesan untuk notifikasi status (diekspos untuk testing). */
export function buildStatusMessage(input: NotifyStatusInput): string {
  return statusNotificationMessage(input.status, {
    customerName: input.customerName,
    orderToken: input.orderToken,
    total: input.total,
  });
}

// re-export agar pemakaian lama tetap jalan
export { ORDER_STATUS_LABELS };
