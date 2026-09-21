'use client';

import { useRealtime } from '@/hooks/use-realtime';

/** Subscribe realtime; router.refresh() otomatis memperbarui Server Component. */
export function OrderDetailRealtime({ orderToken }: { orderToken: string }) {
  useRealtime((event) => {
    // Filter ekstra di client: hanya event order ini yang memicu apa pun.
    if (event.topic.startsWith('order:') && event.payload?.orderToken !== orderToken) return;
  });
  return null;
}
