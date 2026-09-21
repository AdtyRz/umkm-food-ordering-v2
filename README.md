# UMKM Food Ordering 🍜

Aplikasi pemesanan makanan UMKM realtime — **simple untuk pelanggan, powerful untuk pemilik usaha**.

Dibangun sesuai `PRD PROJECT BRIEF.md`: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + MySQL (development via XAMPP) + Drizzle ORM.

> ⚠️ **Mode development saat ini memakai MySQL/MariaDB (XAMPP)**. Saat deploy, aplikasi dimigrasikan ke **Supabase** (PostgreSQL + Auth + Storage + Realtime). Panduan migrasi ada di bagian bawah.

---

## ✨ Fitur

### Customer (tanpa login!)
- **Token Session** — `UMKM-XXXXX-XXXXX`, disimpan sebagai hash SHA-256 di DB, cookie httpOnly
- **Menu** — kategori pill, pencarian, product card dengan status stok (Masih Banyak / Sedikit Lagi / Habis)
- **Detail produk** — bottom sheet + quantity stepper
- **Keranjang** — localStorage, update qty, deteksi produk habis realtime
- **Checkout** — nama, HP, catatan, **QRIS / COD**, kode promo
- **Tracking realtime** — timeline status pesanan, update tanpa refresh
- **Pengaturan** — tema light/dark/system, info toko, peta lokasi (Leaflet), kontak WA/Telepon/Email

### Admin (login email + password)
- **Dashboard** — pendapatan hari ini, order, grafik 7 hari, produk terlaris, notifikasi order baru realtime
- **Pesanan** — filter status, detail, ubah status order (transisi tervalidasi) & verifikasi pembayaran
- **Produk & Kategori** — CRUD + upload gambar (validasi MIME & ukuran)
- **Promo** — percentage / fixed amount, minimum belanja, maks diskon, periode
- **Laporan** — harian / mingguan / bulanan / tahunan + analitik
- **Toko** — info, status (otomatis / buka paksa / tutup paksa), jam operasional, QRIS & COD

### Keamanan (sesuai PRD §83-85)
- Semua harga & promo **dihitung ulang di server** — input browser tidak dipercaya
- Order token `ORD-XXXXXX`, customer token di-hash (raw token tidak pernah disimpan)
- Guard server di semua route admin (bukan sekadar hide menu)
- Transisi status order tervalidasi (tidak bisa lompat status)
- Upload file: whitelist MIME + batas 2MB
- History status bersifat append-only

---

## 🚀 Mulai Cepat

### 0. Prasyarat
- Node.js 20+
- XAMPP (modul **MySQL/MariaDB** di-start dari XAMPP Control Panel)

### 1. Install & konfigurasi
```bash
cd umkm-food-ordering
npm install
cp .env.example .env.local   # lalu sesuaikan (atau edit yang sudah ada)
```

Generate `AUTH_SECRET` (wajib, min 32 karakter):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 2. Setup database
Pastikan MySQL di XAMPP sudah running, lalu:
```bash
npm run db:setup
```
Script ini otomatis: membuat database `umkm_food_ordering`, semua tabel, seed (9 produk, 4 kategori, 2 promo, jam operasional, setting toko), dan akun admin awal dari `.env.local`.

### 3. Jalankan
```bash
npm run dev
```

| Sisi | URL | Kredensial default |
|---|---|---|
| Customer | http://localhost:3000 | tanpa login — klik "Buat Token Baru" |
| Admin | http://localhost:3000/admin/login | `admin@kedairasa.id` / `admin123456` |

### 4. Test
```bash
npm test          # 29 unit test (token, promo, status toko, business rules)
```

---

## 🏗️ Arsitektur

```
src/
├── app/
│   ├── page.tsx                 # Token gate (customer)
│   ├── actions/                 # Server actions customer (session, checkout)
│   ├── (customer)/              # Route group: menu, cart, checkout, orders, settings
│   ├── admin/
│   │   ├── login/               # Login admin
│   │   ├── actions.ts           # Semua server action admin (requireAdmin di awal)
│   │   └── (dashboard)/         # Layout guard + dashboard, orders, products,
│   │                            # categories, promos, reports, store
│   └── api/
│       ├── realtime/            # SSE endpoint (realtime lokal)
│       └── images/              # Serving gambar upload (anti path-traversal)
├── components/
│   ├── ui/                      # Design system reusable (Button, Modal, Toast, dst)
│   └── domain/                  # ProductCard, OrderTimeline, BottomNav, dst
├── services/                    # Business logic (Order, Catalog, Promo, Store,
│                                # Report, WhatsApp, AdminAuth, CustomerSession, Realtime)
├── lib/                         # token, storage, validations (zod)
├── db/                          # Drizzle schema + koneksi
├── hooks/                       # useCart, useTheme, useRealtime
└── utils/                       # format, slug, kalkulasi promo & status toko
```

### Alur order (server-side penuh)
```
Keranjang (client)
  → createOrderAction  → validasi session & zod
  → cek status toko (buka/tutup)
  → ambil harga dari DB (bukan dari browser)
  → validasi stok per item
  → validasi & hitung promo
  → TRANSACTION: order + items + payment + history + promo_usage
  → realtime: admin + customer
  → WhatsApp notification (best-effort)
```

### Realtime (development)
Menggunakan **SSE (Server-Sent Events)** via `/api/realtime` dengan topik:
- `store` — status toko berubah
- `products` — ketersediaan produk berubah
- `order:{session_id}` — update pesanan milik satu customer saja
- `admin` — order baru & perubahan order (khusus admin yang login)

Customer **hanya** menerima topik `order:{session miliknya}` — tidak bisa melihat pesanan orang lain.

---

## 🔁 Migrasi ke Supabase (saat deploy)

Checklist lengkap:

1. **Buat proyek Supabase** (gratis) → catat `Project URL`, `anon key`, `service_role key`, dan **JWT Secret** (Settings → API).

2. **Database** — jalankan `supabase/migrations/001_initial.sql` di SQL Editor Supabase. File ini berisi schema PostgreSQL + **RLS policies** + **realtime publication** (siap pakai, termasuk policy customer-read-own-order via JWT klaim `session_id`).

3. **Auth admin** — ganti `services/admin-auth.ts` dengan Supabase Auth (`@supabase/ssr`). Buat user admin, lalu insert baris `admin_profiles` untuk user tersebut. Halaman admin tidak perlu banyak berubah — cukup `getAdminSession()`.

4. **Realtime** — ganti implementasi `services/realtime.ts`:
   - Token customer realtime: tanda tangan JWT dengan klaim `app_metadata.session_id` memakai **Supabase JWT Secret** (fungsi `createRealtimeJWT()` sudah ada).
   - Client subscribe via `supabase.channel()` pada tabel `orders`, `order_items`, `order_status_histories`, `payments`, `products`, `store_settings`.
   - RLS memastikan customer hanya menerima pesanannya sendiri.

5. **Storage** — ganti `lib/storage.ts` dengan Supabase Storage bucket (`products/`, `store/`, `qris/`) dan sesuaikan URL gambar.

6. **WhatsApp produksi** — set `WHATSAPP_PROVIDER=fonnte` + `WHATSAPP_TOKEN` di environment (atau tambah adapter provider lain di `services/whatsapp.ts`).

7. **Environment produksi** — jangan pernah commit/expose `SUPABASE_SERVICE_ROLE_KEY` ke browser.

---

## 📋 Status Pengerjaan

- [x] Database MySQL + seed (development) & skema Supabase (deploy)
- [x] Customer token/session (hash, httpOnly cookie, restore)
- [x] Menu, keranjang, checkout, promo, QRIS/COD
- [x] Tracking pesanan realtime + timeline
- [x] Admin auth, dashboard, CRUD produk/kategori/promo
- [x] Manajemen pesanan + transisi status tervalidasi
- [x] Laporan harian/mingguan/bulanan/tahunan + grafik
- [x] Pengaturan toko, jam operasional, QRIS/COD, peta
- [x] WhatsApp service (mock dev + adapter Fonnte)
- [x] 29 unit test lulus + TypeScript clean + production build sukses
- [ ] Migrasi Supabase (saat deploy)

---

*Dibuat dengan Next.js 16, Tailwind CSS v4, Drizzle ORM, dan banyak kopi.* ☕
