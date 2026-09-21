'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';

const NAV_ITEMS = [
  { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/cart', label: 'Keranjang', icon: ShoppingBag },
  { href: '/orders', label: 'Status', icon: Store },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          const isCart = href === '/cart';
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {isCart && itemCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pop">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </span>
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
