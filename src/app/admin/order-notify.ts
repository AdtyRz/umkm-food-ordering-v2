'use server';

/**
 * Kirim pemberitahuan manual ke customer via WhatsApp.
 *
 * Dipakai admin di halaman detail pesanan — terutama saat bot WA
 * DINONAKTIFKAN di panel Toko (notifikasi otomatis dilewati, admin
 * yang menentukan kapan pemberitahuan dikirim).
 *
 * Format nomor tujuan mengikuti input customer, dinormalisasi ke +62.
 */
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/services/admin-auth';
import { sendNotificationSchema } from '@/lib/validations';

export type SendNotificationResult =
  | { ok: true; sentTo: string; provider: string }
  | { ok: false; error: string };

/** Template pesan per status (murni, mudah diuji). */
function manualMessageTemplate(
  status: string,
  ctx: { orderToken: string; customerName: string | null; total: number; storeName: string }
): string {
  const name = ctx.customerName || 'Kak';
  const lines: string[] = [];
  lines.push(`Halo ${name},`);
  lines.push('');
  lines.push(`Update pesanan *${ctx.orderToken}* di ${ctx.storeName}:`);
  const map: Record<string, string> = {
    pending: 'pesanan kamu sudah kami terima dan menunggu persetujuan.',
    approved: 'pesanan kamu disetujui dan akan segera diproses.',
    processing: 'pesanan kamu sedang kami proses.',
    ready: 'pesanan sudah siap — silakan diambil / diantar.',
    delivering: 'pesanan sedang diantar ke lokasimu.',
    completed: 'pesanan selesai. Terima kasih sudah memesan!',
    rejected: 'maaf, pesanan kamu harus ditolak. Hubungi kami untuk info lebih lanjut.',
    cancelled: 'pesanan dibatalkan.',
  };
  lines.push(map[status] ?? `status pesanan: ${status}.`);
  lines.push('');
  lines.push(`Total: Rp ${ctx.total.toLocaleString('id-ID')}`);
  lines.push('');
  lines.push('📌 Simpan token pesanan sampai pesanan selesai ya!');
  return lines.join('\n');
}

export async function sendOrderNotificationAction(input: {
  orderId: string;
  message?: string;
}): Promise<SendNotificationResult> {
  try {
    const admin = await requireAdmin();

    const parsed = sendNotificationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? 'Data tidak valid' };
    }

    const { db } = await import('@/db');
    const { orders, customers } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    const { getStoreInfo } = await import('@/services/store');

    const [row] = await db
      .select({
        orderToken: orders.orderToken,
        orderStatus: orders.orderStatus,
        total: orders.total,
        name: customers.name,
        phone: customers.phone,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, parsed.data.orderId))
      .limit(1);

    if (!row) return { ok: false, error: 'Pesanan tidak ditemukan.' };
    if (!row.phone) {
      return { ok: false, error: 'Customer tidak punya nomor HP terdaftar.' };
    }

    const store = await getStoreInfo();
    const storeName = store?.storeName ?? 'Toko kami';

    // Pesan custom admin ATAU template per status
    const message =
      parsed.data.message?.trim() ||
      manualMessageTemplate(row.orderStatus, {
        orderToken: row.orderToken,
        customerName: row.name,
        total: Number(row.total),
        storeName,
      });

    const { sendWhatsAppMessage } = await import('@/services/whatsapp');
    const result = await sendWhatsAppMessage(row.phone, message);

    if (!result.ok) {
      return { ok: false, error: result.error ?? 'Gagal mengirim pesan.' };
    }

    // Catat di riwayat status agar jejak audit jelas
    const { orderStatusHistories } = await import('@/db/schema');
    await db.insert(orderStatusHistories).values({
      orderId: parsed.data.orderId,
      status: row.orderStatus,
      note: `Pemberitahuan manual dikirim ke ${row.phone} oleh ${admin.name}`,
      changedBy: admin.name,
    });

    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    return { ok: true, sentTo: `+${row.phone.replace(/^(\\+62|62|0)/, '62')}`, provider: result.provider };
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return { ok: false, error: 'Sesi berakhir. Login ulang.' };
    }
    console.error('[sendOrderNotificationAction]', err);
    return { ok: false, error: 'Gagal mengirim pemberitahuan.' };
  }
}
