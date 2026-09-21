import { getAllPromos } from '@/services/promo';
import { PromosClient } from './promos-client';

export const metadata = { title: 'Promo' };
export const dynamic = 'force-dynamic';

export default async function AdminPromosPage() {
  const promos = await getAllPromos();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Promo</h1>
        <p className="text-sm text-muted-foreground">Buat dan kelola kode promo.</p>
      </div>
      <PromosClient
        promos={promos.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          type: p.type,
          value: Number(p.value),
          minimumPurchase: Number(p.minimumPurchase),
          maximumDiscount: p.maximumDiscount != null ? Number(p.maximumDiscount) : null,
          startsAt: p.startsAt ? p.startsAt.toISOString().slice(0, 10) : '',
          endsAt: p.endsAt ? p.endsAt.toISOString().slice(0, 10) : '',
          isActive: p.isActive,
        }))}
      />
    </div>
  );
}
