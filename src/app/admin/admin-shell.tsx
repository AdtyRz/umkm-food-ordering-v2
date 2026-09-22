'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3,
  Bell,
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Package,
  Settings,
  Store,
  Tag,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtime } from '@/hooks/use-realtime';
import { AdminBottomNav } from '@/components/domain/admin-bottom-nav';
import { logoutAction } from './actions';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Pesanan', icon: ClipboardList },
  { href: '/admin/products', label: 'Produk', icon: Package },
  { href: '/admin/categories', label: 'Kategori', icon: Tag },
  { href: '/admin/promos', label: 'Promo', icon: Tag },
  { href: '/admin/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/admin/store', label: 'Toko', icon: Store },
  { href: '/admin/settings', label: 'Pengaturan', icon: Settings },
] as const;

/** Href bottom bar (urutan = AdminBottomNav). Dipakai untuk menyaring nav overflow hamburger. */
const BOTTOM_NAV_HREFS = [
  '/admin/dashboard',
  '/admin/orders',
  '/admin/products',
  '/admin/reports',
  '/admin/store',
] as const;

export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOrderPing, setNewOrderPing] = useState(false);

  // Realtime: ping visual saat order baru masuk
  useRealtime((event) => {
    if (event.type === 'order.new') {
      setNewOrderPing(true);
      setTimeout(() => setNewOrderPing(false), 5000);
    }
  });

  const handleLogout = () => {
    logoutAction().then(() => {
      router.push('/admin/login');
      router.refresh();
    });
  };

  const navList = (items: readonly { href: string; label: string; icon: typeof LayoutDashboard }[]) => (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navigasi admin">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
            {href === '/admin/orders' && newOrderPing && (
              <span className="ml-auto flex h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" aria-label="Pesanan baru!" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  // Nav yang tidak masuk bottom bar → lewat hamburger mobile.
  const OVERFLOW_ITEMS = NAV.filter((item) =>
    BOTTOM_NAV_HREFS.every((h) => !item.href.startsWith(h))
  );

  return (
    <div className="flex min-h-dvh bg-muted/40">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
            <CookingPot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight">Kedai Rasa</p>
            <p className="text-[11px] text-muted-foreground">Panel Admin</p>
          </div>
        </div>
        {navList(NAV)}
        <div className="border-t border-border p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground">Halo, {adminName}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </aside>

      {/* Area konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:hidden">
          <p className="flex-1 font-extrabold">Kedai Rasa Admin</p>
          <Bell className={cn('h-5 w-5', newOrderPing && 'text-destructive animate-pop')} />
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-4 pb-24 lg:p-6">{children}</main>
      </div>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-overlay animate-fade-in" onClick={() => setDrawerOpen(false)} />
          {/* Drawer slide dari KIRI */}
          <div className="absolute left-0 top-0 h-full w-64 bg-card shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="font-extrabold">Kedai Rasa</p>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Hanya nav yang TIDAK ada di bottom bar (mobile) */}
            {navList(OVERFLOW_ITEMS)}
            <div className="border-t border-border p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav 5 item (mobile) — konsisten dengan sisi customer */}
      <AdminBottomNav />
    </div>
  );
}
