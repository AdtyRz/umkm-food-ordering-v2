import { Phone, Mail, MapPin, MessageCircle, User } from 'lucide-react';
import { getCustomerSession } from '@/services/customer-session';
import { getStoreInfo, getOperatingHours, getStoreOpenStatus } from '@/services/store';
import { Card } from '@/components/ui';
import { SettingsClient, MapWrapper } from './settings-client';
import { formatDayHours } from '@/utils';

export const metadata = { title: 'Pengaturan' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [session, store, hours, status] = await Promise.all([
    getCustomerSession(),
    getStoreInfo(),
    getOperatingHours(),
    getStoreOpenStatus(),
  ]);

  if (!store) return null;

  const waLink = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/^(\+62|62|0)/, '62')}`
    : null;

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan</h1>

      {/* Tema */}
      <SettingsClient />

      {/* Token & status toko */}
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-bold">Token Kamu</h2>
        <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft/50 px-4 py-3 text-center">
          <p className="font-mono text-lg font-bold tracking-widest text-primary select-all">
            {session?.customerToken ?? '-'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Simpan token ini. Dengan token, kamu bisa melihat pesanan dari perangkat lain.
        </p>
        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
          <span>Status Toko</span>
          <span className={`font-bold ${status?.isOpen ? 'text-success' : 'text-destructive'}`}>
            {status?.isOpen ? 'BUKA' : 'TUTUP'}
          </span>
        </div>
      </Card>

      {/* Identitas toko */}
      <Card className="space-y-2.5 p-4">
        <h2 className="text-sm font-bold">Tentang Toko</h2>
        {store.description && <p className="text-sm text-muted-foreground">{store.description}</p>}
        {store.address && (
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {store.address}
          </p>
        )}
        {store.phone && (
          <a href={`tel:${store.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
            <Phone className="h-4 w-4 text-primary" /> {store.phone}
          </a>
        )}
        {store.email && (
          <a href={`mailto:${store.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
            <Mail className="h-4 w-4 text-primary" /> {store.email}
          </a>
        )}
      </Card>

      {/* Jam operasional */}
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-bold">Jam Operasional</h2>
        <ul className="space-y-1">
          {hours.map((h) => (
            <li key={h.dayOfWeek} className="flex justify-between text-sm">
              <span>{formatDayHours(h.dayOfWeek, h.openTime, h.closeTime, h.isClosed).split(':')[0]}</span>
              <span className={h.isClosed ? 'text-muted-foreground' : 'font-medium'}>
                {h.isClosed ? 'Tutup' : `${h.openTime} - ${h.closeTime}`}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Peta */}
      {store.latitude != null && store.longitude != null && (
        <Card className="overflow-hidden p-0">
          {/* isolate: kontain stacking context Leaflet agar tidak menembus navbar */}
          <div className="relative isolate h-52 w-full">
            {/* Peta interaktif client-side */}
            <MapWrapper
              latitude={store.latitude}
              longitude={store.longitude}
              storeName={store.storeName}
            />
          </div>
          <a
            href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-t border-border p-3 text-center text-sm font-semibold text-primary"
          >
            Buka di Google Maps
          </a>
        </Card>
      )}

      {/* Hubungi pemilik */}
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-bold">Hubungi Kami</h2>
        <div className="grid grid-cols-1 gap-2">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary"
            >
              <Phone className="h-4 w-4" /> Telepon
            </a>
          )}
          {store.email && (
            <a
              href={`mailto:${store.email}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          )}
        </div>
      </Card>

      {/* Developer */}
      {store.developerName && (
        <Card className="p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <User className="h-4 w-4" /> Dikembangkan oleh
          </h2>
          <p className="mt-1.5 text-sm font-semibold">{store.developerName}</p>
          {store.developerInfo && (
            <p className="text-xs text-muted-foreground">{store.developerInfo}</p>
          )}
          {store.developerContact && (
            <a
              href={store.developerContact}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
            >
              {store.developerContact}
            </a>
          )}
        </Card>
      )}
    </div>
  );
}
