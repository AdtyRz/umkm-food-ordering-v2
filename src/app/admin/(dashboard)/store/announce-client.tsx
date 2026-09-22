'use client';

import { useState } from 'react';
import { Check, Copy, Image as ImageIcon, Megaphone, Share2, MessageCircle } from 'lucide-react';
import { Button, Card, useToast } from '@/components/ui';
import { getAnnouncementAction } from '../../actions';

type Tab = 'caption' | 'broadcast';

export function AnnounceClient() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('caption');
  const [caption, setCaption] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = tab === 'caption' ? caption : broadcast;

  const generate = async () => {
    setLoading(true);
    setCopied(false);
    const res = await getAnnouncementAction();
    setLoading(false);
    if (!res.ok) {
      push(res.error, 'error');
      return;
    }
    setCaption(res.caption);
    setBroadcast(res.broadcast);

    // Bagikan langsung isi tab aktif via share sheet (mobile); fallback: salin
    const value = tab === 'caption' ? res.caption : res.broadcast;
    const data = { title: 'Pengumuman Toko', text: value };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // user membatalkan share sheet → teks tetap tampil untuk disalin manual
      }
    }
    await copy(value);
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      push('Teks disalin', 'success');
    } catch {
      push('Gagal menyalin — salin manual dari kotak teks.', 'error');
    }
  };

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Megaphone className="h-4 w-4" /> Pengumuman
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Teks &amp; poster siap-posting dari data toko saat ini — selalu akurat.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button type="button" onClick={generate} loading={loading}>
          <Share2 className="h-4 w-4" /> Bagikan
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open('/poster', '_blank', 'noopener,noreferrer')}
        >
          <ImageIcon className="h-4 w-4" /> Buka Poster
        </Button>
      </div>

      {text && (
        <div className="animate-fade-in">
          {/* Pilihan teks */}
          <div className="mb-2 flex gap-1.5" role="tablist" aria-label="Jenis teks">
            {(
              [
                { id: 'caption', label: 'Caption Status', icon: Share2 },
                { id: 'broadcast', label: 'Payload WA', icon: MessageCircle },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setCopied(false);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.id
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/50 p-3">
            <p className="whitespace-pre-wrap break-words text-sm">{text}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(text)}
            className="mt-2 w-full"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Tersalin' : 'Salin lagi'}
          </Button>
        </div>
      )}
    </Card>
  );
}
