import { getStoreInfo, getOperatingHours } from '@/services/store';
import { StoreSettingsClient } from './store-client';
import { StoreStatusClient } from './status-client';
import { HoursClient } from './hours-client';
import { PaymentSettingsClient } from './payment-client';

export const metadata = { title: 'Toko' };
export const dynamic = 'force-dynamic';

export default async function AdminStorePage() {
  const [store, hours] = await Promise.all([getStoreInfo(), getOperatingHours()]);
  if (!store) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Toko</h1>
        <p className="text-sm text-muted-foreground">Informasi, status, jam buka, dan pembayaran.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <StoreStatusClient
            mode={store.storeStatusMode}
          />
          <StoreSettingsClient
            store={{
              storeName: store.storeName,
              description: store.description ?? '',
              phone: store.phone ?? '',
              whatsapp: store.whatsapp ?? '',
              email: store.email ?? '',
              address: store.address ?? '',
              latitude: store.latitude,
              longitude: store.longitude,
              timezone: store.timezone,
              developerName: store.developerName ?? '',
              developerInfo: store.developerInfo ?? '',
              developerContact: store.developerContact ?? '',
            }}
          />
        </div>
        <div className="space-y-4">
          <HoursClient hours={hours} />
          <PaymentSettingsClient
            qrisReceiverName={store.qrisReceiverName ?? ''}
            codEnabled={store.codEnabled}
          />
        </div>
      </div>
    </div>
  );
}
