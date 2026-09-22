# Kedai Rasa — UMKM Food Ordering 🍜

<p align="center">
  <img src="src/logo/logo.png" alt="Kedai Rasa" width="96" />
</p>

Aplikasi pemesanan makanan UMKM **realtime** — simple untuk pelanggan (tanpa login!), powerful untuk pemilik usaha.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · **Supabase (PostgreSQL)** · Drizzle ORM · Vitest

> ⭐ Proyek ini **open source** (MIT). Kontribusi dipersilakan — lihat bagian [Kontribusi](#-kontribusi).

---

## ✨ Fitur

### 👤 Customer — tanpa daftar akun
- **Token session** `UMKM-XXXXX-XXXXX` — masuk tanpa login; token disimpan sebagai **hash SHA-256** di DB, cookie httpOnly
- **Data pemesan tersimpan** — nama & No. HP dari pesanan pertama otomatis jadi default di pesanan berikutnya (tetap bisa diedit)
- **Menu** — filter kategori, pencarian, status stok realtime (Masih Banyak / Sedikit Lagi / Habis)
- **Keranjang** — localStorage, deteksi produk habis realtime
- **Checkout** — QRIS / COD, kode promo, catatan
- **Popup QRIS saat checkout** — QR langsung tampil setelah order dibuat: **download QR**, tombol **“Sudah Bayar”**, dan **upload bukti transfer**
- **Tracking realtime** — timeline status pesanan, update tanpa refresh (SSE)
- **Pengaturan** — tema light/dark, info toko, peta, kontak

### 🛠️ Admin — login email + password
- **Dashboard** — pendapatan & pesanan hari ini, grafik 7 hari, produk terlaris, order baru realtime
- **Pesanan** — filter status, transisi tervalidasi, verifikasi pembayaran + lihat **bukti transfer** customer
- **Produk & Kategori** — CRUD + upload gambar
- **Promo** — persentase / nominal, minimum belanja, maks diskon, periode
- **Laporan** — harian / mingguan / bulanan / tahunan + analitik
- **Toko** — info, logo, status buka/tutup (otomatis dari jam operasional atau paksa), jam buka 7 hari, **upload foto QRIS**, COD on/off
- **Pengumuman** — 1 tombol: caption buka/tutup otomatis dari data terkini, payload WhatsApp broadcast, dan link **poster publik `/poster`** (logo + status + jam hari ini + 3 produk yang pasti tersedia — tidak ada lagi poster basi)

### 🔔 Notifikasi WhatsApp (berpetunjuk)
Pesan WA tidak hanya memberi tahu status, tapi juga **mengarahkan customer**:
- Simpan token selama pesanan berjalan (token ditulis di pesan)
- Pantau status di halaman pesanan — tidak perlu chat admin dulu
- Info refund saat pesanan ditolak, ucapan terima kasih saat selesai

### 🔒 Keamanan
- Semua harga, diskon, promo **dihitung ulang di server** — input browser tidak dipercaya
- Token customer di-hash; raw token hanya di cookie httpOnly
- Order wajib milik session pemanggil (customer tidak bisa lihat pesanan orang lain)
- Transisi status order tervalidasi (tidak bisa lompat status)
- Upload: whitelist MIME + maks 2MB; serving gambar anti path-traversal
- Semua server action admin berawal `requireAdmin()`

---

## 🚀 Mulai Cepat (Supabase)

### 0. Prasyarat
- Node.js 20+
- Akun **Supabase** gratis → [supabase.com](https://supabase.com)

### 1. Setup proyek Supabase
1. Buat proyek baru → tunggu provisioning selesai
2. **SQL Editor** → jalankan seluruh file `supabase/migrations/001_initial.sql`, lalu `002_seed.sql`
3. **Project Settings → Database → Connection string → Pooler** (port **6543**, mode Transaction) → salin URI

### 2. Install & konfigurasi
```bash
git clone https://github.com/username/kedai-rasa.git
cd kedai-rasa
npm install
cp .env.example .env.local
```

Isi `.env.local`:
```env
# Supabase pooler (port 6543) — WAJIB lewat pooler, bukan direct 5432
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres

AUTH_SECRET=hasil-generate-di-bawah
ADMIN_EMAIL=admin@tokoku.id
ADMIN_PASSWORD=password-kuat-minimal-8
ADMIN_NAME=Admin Toko

WHATSAPP_PROVIDER=mock        # produksi: fonnte + WHATSAPP_TOKEN
```

Generate `AUTH_SECRET` (wajib, min 32 karakter):
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> 💡 **Kenapa port 6543?** Koneksi Drizzle/postgres.js ke Supabase **wajib** `prepare: false` (sudah diset di `src/db/index.ts`) dan lewat **pooler transaction mode**, kalau tidak akan muncul error intermiten `prepared statement does not exist` pada query paralel.

### 3. Jalankan
```bash
npm run dev
```

| Sisi | URL | Kredensial |
|---|---|---|
| Customer | http://localhost:3000 | tanpa login — klik “Buat Token Baru” |
| Admin | http://localhost:3000/admin/login | dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` |

### 4. Test
```bash
npm test   # unit test: token, promo, status toko, pengumuman, broadcast
```

---

## 🏗️ Arsitektur

```
src/
├── app/
│   ├── page.tsx                 # Token gate (customer)
│   ├── poster/                  # Poster publik dinamis (share medsos)
│   ├── actions/                 # Server action customer (session, checkout, QRIS)
│   ├── (customer)/              # Route group terproteksi: menu, cart, checkout, orders, settings
│   ├── admin/
│   │   ├── actions.ts           # Server action admin (requireAdmin di awal)
│   │   └── (dashboard)/         # Dashboard, orders, products, promos, reports, store
│   └── api/
│       ├── realtime/            # SSE endpoint (realtime lokal)
│       └── images/              # Serving gambar upload (anti path-traversal)
├── components/                  # ui/ (design system) + domain/ (bisnis)
├── services/                    # Business logic: order, catalog, promo, store,
│                                # report, whatsapp, admin-auth, customer-session, realtime
├── lib/                         # token, storage, validations (zod)
├── db/                          # Drizzle schema + koneksi (prepare:false utk pooler)
├── hooks/                       # useCart, useTheme, useRealtime
└── utils/                       # format, token, promo, status toko, teks WA/pengumuman
```

### Alur order (server-side penuh)
```
Keranjang (client)
  → createOrderAction → validasi session + zod
  → cek status toko (buka/tutup)
  → ambil harga dari DB (bukan dari browser)
  → validasi stok per item + hitung promo
  → TRANSACTION: orders + order_items + payments + histories + promo_usages
  → simpan nama & No. HP ke customers (prefill pesanan berikutnya)
  → realtime: admin + customer
  → WhatsApp notification (best-effort)
  → (QRIS) popup bayar: download QR / Sudah Bayar / upload bukti TF
```

### Realtime
SSE via `/api/realtime` dengan topik:
- `store` — status toko berubah
- `products` — ketersediaan produk berubah
- `order:{session_id}` — update pesanan milik satu customer saja
- `admin` — order baru, bukti bayar baru (khusus admin login)

---

## 🤝 Kontribusi

1. Fork → buat branch (`git checkout -b fitur-keren`)
2. `npm test` dan `npx tsc --noEmit` harus hijau sebelum commit
3. Commit deskriptif, lalu Pull Request
4. Untuk perubahan besar, buka Issue dulu untuk diskusi

## 📄 Lisensi

Dilisensikan di bawah [MIT License](LICENSE) — bebas dipakai, dimodifikasi, dan didistribusikan. Cocok untuk UMKM mana pun yang ingin Go-digital. 🇮🇩

---

*Dibuat dengan Next.js 16, Tailwind CSS v4, Drizzle ORM, Supabase, dan banyak kopi.* ☕
