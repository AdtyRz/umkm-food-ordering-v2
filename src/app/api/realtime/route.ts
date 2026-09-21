import { NextRequest } from 'next/server';
import {
  eventMatchesFilter,
  subscribeRealtime,
  type RealtimeEvent,
} from '@/services/realtime';
import { getAdminSession } from '@/services/admin-auth';
import { getCustomerSession } from '@/services/customer-session';

export const dynamic = 'force-dynamic';

/**
 * Cek ringan untuk reconnect logic di client (tanpa membuka stream SSE).
 * 401 → session tidak valid (admin maupun customer) → client tahu harus
 * kembali ke login/token gate, bukan terus retry.
 */
export async function HEAD() {
  const admin = await getAdminSession();
  const session = admin ? null : await getCustomerSession();
  if (!admin && !session) {
    return new Response(null, { status: 401 });
  }
  return new Response(null, { status: 200 });
}

/**
 * SSE endpoint pengganti Supabase Realtime di development.
 * Topik yang boleh diterima klien ditentukan server:
 *   * Admin  → store, products, admin
 *   * Customer → store, products, order:{session miliknya saja}
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminSession();
  const session = admin ? null : await getCustomerSession();

  const topics: string[] = [];
  if (admin) topics.push('store', 'products', 'admin');
  if (session) topics.push('store', 'products', `order:${session.sessionId}`);
  if (topics.length === 0) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | undefined;

      const unsubscribe = subscribeRealtime((event: RealtimeEvent) => {
        if (closed || !eventMatchesFilter(event, { topics })) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
          // Session hangus → kirim event lalu tutup stream supaya browser
          // tidak reconnect dengan token yang sudah tidak berlaku.
          if (event.type === 'session.revoked') {
            closed = true;
            unsubscribe();
            if (heartbeat) clearInterval(heartbeat);
            try {
              controller.close();
            } catch {
              // sudah tertutup
            }
          }
        } catch {
          closed = true;
        }
      });

      // Heartbeat agar koneksi tidak diputus proxy
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': hb\n\n'));
        } catch {
          closed = true;
        }
      }, 25_000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // sudah tertutup
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
