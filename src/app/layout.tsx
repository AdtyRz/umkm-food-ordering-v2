import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/hooks/use-theme';
import { ToastProvider } from '@/components/ui';
import { CartProvider } from '@/hooks/use-cart';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Kedai Rasa — Pesan Makanan Favoritmu',
    template: '%s | Kedai Rasa',
  },
  description:
    'Aplikasi pemesanan makanan UMKM: pesan tanpa login, pantau status pesanan secara realtime.',
  openGraph: {
    title: 'Kedai Rasa — Pesan Makanan Favoritmu',
    description: 'Pesan tanpa login, pantau status realtime.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (    <html lang="id" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        {/* Terapkan tema sebelum paint agar tidak flash.
            Pola resmi Next 16: <Script strategy="beforeInteractive"> di
            root layout — Next memindahkannya ke <head> HTML awal dan
            mengeksekusinya sebelum hidrasi. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('umkm-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <ToastProvider>
            <CartProvider>{children}</CartProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
