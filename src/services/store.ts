/**
 * StoreService — data & status toko.
 */
import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { storeOperatingHours, storeSettings } from '@/db/schema';
import { computeStoreOpenStatus, type OperatingHourRow } from '@/utils';
import type { StoreInfo, StoreOpenStatus } from '@/types';

/** Baca pengaturan toko (single row id=1). */
export async function getStoreInfo(): Promise<StoreInfo | null> {
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  if (!row) return null;

  return {
    storeName: row.storeName,
    description: row.description,
    logoPath: row.logoPath,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    storeStatusMode: row.storeStatusMode,
    manualStoreStatus: row.manualStoreStatus,
    timezone: row.timezone,
    qrisImagePath: row.qrisImagePath,
    qrisReceiverName: row.qrisReceiverName,
    codEnabled: row.codEnabled,
    waBotNumber: row.waBotNumber,
    waBotEnabled: row.waBotEnabled,
    developerName: row.developerName,
    developerInfo: row.developerInfo,
    developerContact: row.developerContact,
  };
}

/** Konfigurasi bot WA (dipakai whatsapp service & panel admin). */
export async function getWhatsAppConfig(): Promise<{
  botNumber: string | null;
  botEnabled: boolean;
}> {
  const [row] = await db
    .select({ botNumber: storeSettings.waBotNumber, botEnabled: storeSettings.waBotEnabled })
    .from(storeSettings)
    .where(eq(storeSettings.id, 1))
    .limit(1);
  return {
    botNumber: row?.botNumber ?? null,
    botEnabled: row?.botEnabled ?? false,
  };
}

/** Baca jam operasional 7 hari (0=Minggu … 6=Sabtu). */
export async function getOperatingHours(): Promise<OperatingHourRow[]> {
  const rows = await db
    .select()
    .from(storeOperatingHours)
    .orderBy(asc(storeOperatingHours.dayOfWeek));
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    openTime: String(r.openTime).slice(0, 5),
    closeTime: String(r.closeTime).slice(0, 5),
    isClosed: r.isClosed,
  }));
}

/** Status buka/tutup toko saat ini. */
export async function getStoreOpenStatus(): Promise<StoreOpenStatus | null> {
  const info = await getStoreInfo();
  if (!info) return null;
  const hours = await getOperatingHours();
  return computeStoreOpenStatus(
    hours,
    info.storeStatusMode,
    info.manualStoreStatus,
    info.timezone
  );
}

/** Update pengaturan toko (admin). */
export async function updateStoreSettings(
  values: Partial<{
    storeName: string;
    logoPath: string | null;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    timezone: string;
    developerName: string | null;
    developerInfo: string | null;
    developerContact: string | null;
  }>
) {
  await db
    .update(storeSettings)
    .set(values)
    .where(eq(storeSettings.id, 1));
}

/** Ubah mode status toko (admin) + publish realtime. */
export async function setStoreStatusMode(
  mode: 'automatic' | 'force_open' | 'force_closed',
  manualStatus: boolean
) {
  await db
    .update(storeSettings)
    .set({ storeStatusMode: mode, manualStoreStatus: manualStatus })
    .where(eq(storeSettings.id, 1));

  const status = await getStoreOpenStatus();
  const { publishRealtimeEvent } = await import('./realtime');
  publishRealtimeEvent({
    topic: 'store',
    type: 'store.status_changed',
    payload: { isOpen: status?.isOpen ?? false },
  });
}

/** Update jam operasional 7 hari sekaligus (admin). */
export async function updateOperatingHours(
  hours: OperatingHourRow[]
): Promise<void> {
  for (const h of hours) {
    await db
      .update(storeOperatingHours)
      .set({
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })
      .where(eq(storeOperatingHours.dayOfWeek, h.dayOfWeek));
  }
}
