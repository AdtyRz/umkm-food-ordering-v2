'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, ClipboardList, LayoutDashboard, Package, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 5 navigasi utama admin di bottom bar (mobile) — konsisten dengan
 * BottomNav customer. Sisa nav (Kategori, Promo, Pengaturan) tetap
 * dapat diakses lewat hamburger di topbar.
 */
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Pesanan', icon: ClipboardList },
  { href: '/admin/products', label: 'Produk', icon: Package },
  { href: '/admin/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/admin/store', label: 'Toko', icon: Store },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-all active:scale-90',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {label}
              {active && (
                <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
