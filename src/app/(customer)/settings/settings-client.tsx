'use client';

import dynamic from 'next/dynamic';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const THEMES = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
] as const;

export function SettingsClient() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-bold">Tampilan</h2>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all',
              theme === value
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ---------- PETA (client-only, code-split) ----------
const LeafletMap = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

/**
 * Named export biasa — RSC tidak bisa membaca properti dari client module
 * (mis. `SettingsClient.MapWrapper` menjadi undefined di server).
 */
export function MapWrapper(props: {
  latitude: number;
  longitude: number;
  storeName: string;
}) {
  return <LeafletMap {...props} />;
}
