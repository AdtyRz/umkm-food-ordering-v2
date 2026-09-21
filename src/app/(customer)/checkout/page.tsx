'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, QrCode, Tag, X } from 'lucide-react';
import { Button, Card, EmptyState, FieldError, Input, Label, Textarea, useToast } from '@/components/ui';
import { useCart } from '@/hooks/use-cart';
import { createOrderAction, validatePromoAction } from '@/app/actions/checkout';
import { formatRupiah } from '@/utils';
import type { PaymentMethod } from '@/types';

type PromoPreview = { code: string; name: string; discount: number } | null;

export default function CheckoutPage() {
  const router = useRouter();
  const { push } = useToast();
  const { items, subtotal, clearCart, ready } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoPreview>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const discount = promo?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError(null);
    startTransition(async () => {
      const res = await validatePromoAction(promoInput, subtotal);
      setPromoChecking(false);
      if (res.ok) {
        setPromo({ code: res.code, name: res.name, discount: res.discount });
        push(`Promo ${res.code} dipakai!`, 'success');
      } else {
        setPromo(null);
        setPromoError(res.error);
      }
    });
  };

  const handleRemovePromo = () => {
    setPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi cepat di client (validasi final tetap di server)
    if (name.trim().length < 2) return setError('Nama minimal 2 karakter.');
    if (!/^(\+62|62|0)8[0-9]{7,13}$/.test(phone.trim()))
      return setError('Nomor HP tidak valid (contoh: 081234567890).');

    setSubmitting(true);
    startTransition(async () => {
      const res = await createOrderAction({
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim(),
        paymentMethod,
        promoCode: promo?.code ?? '',
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setSubmitting(false);

      if (res.ok) {
        clearCart();
        router.push(`/orders/${res.orderToken}?baru=1`);
      } else {
        setError(res.error);
        push(res.error, 'error');
      }
    });
  };

  if (!ready) return null;

  if (items.length === 0) {
    return (
      <div className="pt-8">
        <EmptyState
          icon={<span className="text-2xl" aria-hidden>🛒</span>}
          title="Keranjang kosong"
          description="Tambahkan produk dulu sebelum checkout."
          action={
            <Link href="/menu">
              <Button>Kembali ke Menu</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Data pemesan */}
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-bold">Data Pemesan</h2>
          <div>
            <Label htmlFor="nama" required>Nama</Label>
            <Input
              id="nama"
              placeholder="Nama kamu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <div>
            <Label htmlFor="hp" required>No. HP (WhatsApp)</Label>
            <Input
              id="hp"
              type="tel"
              inputMode="numeric"
              placeholder="081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={16}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Notifikasi status pesanan dikirim ke nomor ini.
            </p>
          </div>
          <div>
            <Label htmlFor="catatan">Catatan (opsional)</Label>
            <Textarea
              id="catatan"
              placeholder="Contoh: pedas level 2, tanpa bawang..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>
        </Card>

        {/* Pembayaran */}
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-bold">Metode Pembayaran</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('qris')}
              aria-pressed={paymentMethod === 'qris'}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                paymentMethod === 'qris'
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <QrCode className="h-7 w-7" />
              <span className="text-sm font-bold">QRIS</span>
              <span className="text-[11px] text-muted-foreground">Scan & bayar</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              aria-pressed={paymentMethod === 'cod'}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                paymentMethod === 'cod'
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <Banknote className="h-7 w-7" />
              <span className="text-sm font-bold">COD / Tunai</span>
              <span className="text-[11px] text-muted-foreground">Bayar saat terima</span>
            </button>
          </div>
        </Card>

        {/* Promo */}
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <Tag className="h-4 w-4" /> Promo
          </h2>
          {promo ? (
            <div className="flex items-center justify-between rounded-xl bg-success-soft px-3 py-2.5">
              <div>
                <p className="text-sm font-bold text-success">{promo.code}</p>
                <p className="text-xs text-success/80">{promo.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-success">-{formatRupiah(promo.discount)}</span>
                <button type="button" onClick={handleRemovePromo} aria-label="Hapus promo" className="rounded-lg p-1 hover:bg-success/10">
                  <X className="h-4 w-4 text-success" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Kode promo (mis. HEMAT10)"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                maxLength={20}
              />
              <Button type="button" variant="secondary" onClick={handleApplyPromo} loading={promoChecking}>
                Pakai
              </Button>
            </div>
          )}
          <FieldError message={promoError} />
        </Card>

        {/* Ringkasan */}
        <Card className="space-y-2 p-4">
          <h2 className="text-sm font-bold">Ringkasan</h2>
          {items.map((i) => (
            <div key={i.productId} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {i.name} ×{i.quantity}
              </span>
              <span>{formatRupiah(i.price * i.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>Diskon</span>
              <span>-{formatRupiah(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold">
            <span>Total</span>
            <span className="text-primary">{formatRupiah(total)}</span>
          </div>
        </Card>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3.5 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Memproses...' : `Buat Pesanan — ${formatRupiah(total)}`}
        </Button>
      </form>
    </div>
  );
}
