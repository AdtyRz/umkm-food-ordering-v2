'use client';

import dynamic from 'next/dynamic';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Card } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const THEMES = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
] as const;

const ACCENT_OPTIONS = [
  { value: 'orange', label: 'Oranye', swatch: '#ea580c' },
  { value: 'pink', label: 'Pink', swatch: '#db2777' },
  { value: 'green', label: 'Hijau', swatch: '#16a34a' },
  { value: 'blue', label: 'Biru', swatch: '#2563eb' },
  { value: 'purple', label: 'Ungu', swatch: '#9333ea' },
  { value: 'teal', label: 'Toska', swatch: '#0d9488' },
] as const;

export function SettingsClient() {
  const { theme, setTheme, accent, setAccent } = useTheme();

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
              'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all active:scale-95',
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

      {/* Warna tema */}
      <h3 className="mb-2 mt-4 text-sm font-bold">Warna Tema</h3>
      <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Warna tema">
        {ACCENT_OPTIONS.map(({ value, label, swatch }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={accent === value}
            aria-label={label}
            title={label}
            onClick={() => setAccent(value)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-full border-2 transition-all active:scale-90',
              accent === value
                ? 'border-foreground/70 scale-110'
                : 'border-transparent hover:scale-105'
            )}
          >
            <span
              className="flex h-full w-full items-center justify-center rounded-full"
              style={{ backgroundColor: swatch }}
            >
              {accent === value && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
            </span>
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
