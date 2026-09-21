'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export type RealtimeEventPayload = {
  topic: string;
  type: string;
  payload: Record<string, unknown>;
};

const MAX_BACKOFF_MS = 30_000;

/**
 * Berlangganan realtime via SSE.
 *   - Reconnect otomatis dengan exponential backoff (1s → 30s).
 *   - Server menolak (401) → verifikasi ulang session; bila memang
 *     hangus, kembali ke token gate.
 *   - Event `session.revoked` → langsung ke token gate.
 * Set `refreshOnEvent: false` bila ingin menangani event manual.
 */
export function useRealtime(
  onEvent?: (event: RealtimeEventPayload) => void,
  options?: { refreshOnEvent?: boolean }
) {
  const router = useRouter();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const refreshRef = useRef(options?.refreshOnEvent !== false);
  refreshRef.current = options?.refreshOnEvent !== false;

  useEffect(() => {
    let es: EventSource | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const goToTokenGate = () => {
      // Membersihkan riwayat agar tombol back tidak kembali ke halaman mati.
      window.location.replace('/');
    };

    const connect = () => {
      if (disposed) return;
      es = new EventSource('/api/realtime');

      es.onopen = () => {
        retry = 0; // koneksi sehat → reset backoff
      };

      es.onmessage = (e) => {
        let event: RealtimeEventPayload;
        try {
          event = JSON.parse(e.data) as RealtimeEventPayload;
        } catch {
          return;
        }

        if (event.type === 'session.revoked') {
          disposed = true;
          es?.close();
          goToTokenGate();
          return;
        }

        handlerRef.current?.(event);
        if (refreshRef.current) {
          router.refresh();
        }
      };

      es.onerror = () => {
        es?.close();
        if (disposed) return;

        // EventSource tidak membuka kode status; cek ulang session:
        // kalau cookie/token tidak valid lagi, server akan mengarahkan.
        const delay = Math.min(1000 * 2 ** retry, MAX_BACKOFF_MS);
        retry += 1;

        fetch('/api/realtime', { method: 'HEAD' })
          .then((res) => {
            if (res.status === 401) {
              // Bukan admin & session customer mati → token gate.
              // Biarkan SSE yang memutuskan: 401 berarti unauthorized.
              goToTokenGate();
              return;
            }
            timer = setTimeout(connect, delay);
          })
          .catch(() => {
            timer = setTimeout(connect, delay);
          });
      };
    };

    connect();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      es?.close();
    };
  }, [router]);
}
