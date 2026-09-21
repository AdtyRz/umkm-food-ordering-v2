/**
 * RealtimeBus — abstraksi realtime untuk development lokal.
 *
 * Di development (MySQL/XAMPP) event didistribusikan via SSE ke browser
 * customer/admin. Saat migrasi ke Supabase, implementasi ini diganti
 * Supabase Realtime TANPA mengubah pemanggil: `publishRealtimeEvent`
 * tetap dipakai, hanya mekanisme distribusinya yang berubah.
 *
 * Topik:
 *   - `store`     : status toko & pengaturan berubah (publik)
 *   - `products`  : ketersediaan produk berubah (publik)
 *   - `order:{session_id}` : update order milik satu customer
 *   - `admin`     : order baru & perubahan order (khusus admin)
 *
 * Keamanan mengikuti PRD §68-70: customer hanya menerima event topik
 * order miliknya; topik `admin` hanya untuk admin (dicek saat subscribe).
 */
import 'server-only';
import { EventEmitter } from 'node:events';

export type RealtimeEvent =
  | { topic: 'store'; type: 'store.status_changed'; payload: { isOpen: boolean } }
  | { topic: 'store'; type: 'store.updated'; payload: Record<string, unknown> }
  | {
      topic: 'products';
      type: 'product.changed';
      payload: { productId: string; stockStatus: string; isAvailable: boolean; name: string };
    }
  | {
      topic: `order:${string}`;
      type: 'order.created' | 'order.status_changed' | 'order.updated';
      payload: { orderToken: string; orderStatus: string; paymentStatus: string };
    }
  | {
      topic: `order:${string}`;
      type: 'session.revoked';
      payload: { reason: 'completed' };
    }
  | {
      topic: 'admin';
      type: 'order.new' | 'order.changed' | 'product.changed';
      payload: Record<string, unknown>;
    };

type Listener = (event: RealtimeEvent) => void;

// EventEmitter singleton (bertahan antar request di runtime Node)
const globalForBus = globalThis as unknown as {
  umkmBus?: EventEmitter;
  umkmBusSeq?: number;
};

function getBus(): EventEmitter {
  if (!globalForBus.umkmBus) {
    const bus = new EventEmitter();
    bus.setMaxListeners(100);
    globalForBus.umkmBus = bus;
  }
  return globalForBus.umkmBus;
}

/** Publish event dari server action / route handler. */
export function publishRealtimeEvent(event: RealtimeEvent) {
  getBus().emit('event', event);
}

/** Berlangganan event (dipakai SSE route). Returns fungsi unsubscribe. */
export function subscribeRealtime(listener: Listener): () => void {
  const bus = getBus();
  bus.on('event', listener);
  return () => bus.off('event', listener);
}

/** Filter event per klien. */
export type RealtimeFilter = {
  topics: string[]; // topik yang diizinkan klien
};

export function eventMatchesFilter(
  event: RealtimeEvent,
  filter: RealtimeFilter
): boolean {
  return filter.topics.includes(event.topic);
}
