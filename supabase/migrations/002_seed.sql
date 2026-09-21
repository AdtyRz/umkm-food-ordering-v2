-- ============================================================
-- 002_seed.sql — Data awal: kategori, produk, toko, jam operasional
-- ============================================================

-- ---------- CATEGORIES ----------
insert into categories (name, slug, description, sort_order, is_active) values
  ('Makanan', 'makanan', 'Menu makanan utama', 1, true),
  ('Minuman', 'minuman', 'Aneka minuman segar', 2, true),
  ('Snack',   'snack',   'Camilan untuk menemani', 3, true),
  ('Paket',   'paket',   'Paket hemat bundling', 4, true)
on conflict (slug) do nothing;

-- ---------- PRODUCTS ----------
insert into products (category_id, name, slug, description, price, stock_status, is_available) values
  -- Makanan
  ((select id from categories where slug = 'makanan'), 'Nasi Goreng Spesial', 'nasi-goreng-spesial', 'Nasi goreng dengan telur, ayam, dan sayuran segar', 25000, 'many', true),
  ((select id from categories where slug = 'makanan'), 'Mie Goreng Jawa', 'mie-goreng-jawa', 'Mie goreng gaya Jawa dengan bumbu rempah', 22000, 'many', true),
  ((select id from categories where slug = 'makanan'), 'Ayam Geprek Sambal Bawang', 'ayam-geprek-sambal-bawang', 'Ayam crispy digeprek dengan sambal bawang pedas', 23000, 'low', true),
  ((select id from categories where slug = 'makanan'), 'Nasi Rames', 'nasi-rames', 'Nasi dengan ayam bumbu, tempe, dan sambal', 20000, 'many', true),
  ((select id from categories where slug = 'makanan'), 'Soto Ayam Lamongan', 'soto-ayam-lamongan', 'Soto ayam kuah kuning dengan koya dan jeruk nipis', 21000, 'many', true),
  ((select id from categories where slug = 'makanan'), 'Rawon Daging', 'rawon-daging', 'Rawon daging dengan kuah kluwek khas', 28000, 'out', true),
  -- Minuman
  ((select id from categories where slug = 'minuman'), 'Es Teh Manis', 'es-teh-manis', 'Teh manis segar dengan es batu', 5000, 'many', true),
  ((select id from categories where slug = 'minuman'), 'Es Jeruk Peras', 'es-jeruk-peras', 'Jeruk peras asli tanpa pemanis buatan', 8000, 'many', true),
  ((select id from categories where slug = 'minuman'), 'Kopi Susu Gula Aren', 'kopi-susu-gula-aren', 'Kopi susu dengan gula aren asli', 15000, 'many', true),
  ((select id from categories where slug = 'minuman'), 'Jus Alpukat', 'jus-alpukat', 'Jus alpukat creamy dengan topping cokelat', 18000, 'low', true),
  -- Snack
  ((select id from categories where slug = 'snack'), 'Pisang Goreng Crispy', 'pisang-goreng-crispy', 'Pisang goreng crispy dengan keju dan cokelat', 12000, 'many', true),
  ((select id from categories where slug = 'snack'), 'Tahu Crispy', 'tahu-crispy', 'Tahu goreng crispy dengan saus cabai', 10000, 'many', true),
  ((select id from categories where slug = 'snack'), 'Risoles Mayo', 'risoles-mayo', 'Risoles isi smoked beef, telur, dan mayones', 11000, 'many', true),
  ((select id from categories where slug = 'snack'), 'Cireng Bumbu Rujak', 'cireng-bumbu-rujak', 'Cireng kenyal dengan bumbu rujak pedas manis', 9000, 'out', true),
  -- Paket
  ((select id from categories where slug = 'paket'), 'Paket Hemat 1 (Nasi Goreng + Es Teh)', 'paket-hemat-1', 'Nasi Goreng Spesial + Es Teh Manis', 27000, 'many', true),
  ((select id from categories where slug = 'paket'), 'Paket Kenyang (Ayam Geprek + Es Jeruk)', 'paket-kenyang', 'Ayam Geprek + Es Jeruk Peras', 28000, 'many', true),
  ((select id from categories where slug = 'paket'), 'Paket Ngopi Santai (Kopi + Risoles)', 'paket-ngopi-santai', 'Kopi Susu Gula Aren + 2 Risoles Mayo', 23000, 'many', true)
on conflict (slug) do nothing;

-- ---------- STORE SETTINGS ----------
insert into store_settings (
  id, store_name, description, phone, whatsapp, email, address,
  latitude, longitude, store_status_mode, manual_store_status,
  qris_receiver_name, cod_enabled,
  developer_name, developer_info, developer_contact
) values (
  1,
  'Kedai Rasa',
  'Dapur rumahan dengan masakan hangat khas nusantara. Dibuat fresh setiap hari.',
  '6281234567890',
  '6281234567890',
  'hello@kedairasa.example',
  'Jl. Merdeka No. 123, Kota Bandung, Jawa Barat 40115',
  -6.914744,
  107.609811,
  'automatic',
  false,
  'Kedai Rasa',
  true,
  'Aditya Riqi',
  'Developer aplikasi web UMKM',
  'hello@example.dev'
) on conflict (id) do nothing;

-- ---------- OPERATING HOURS (0 = Minggu) ----------
insert into store_operating_hours (day_of_week, open_time, close_time, is_closed) values
  (0, '10:00', '21:00', true),   -- Minggu tutup
  (1, '10:00', '22:00', false),  -- Senin
  (2, '10:00', '22:00', false),  -- Selasa
  (3, '10:00', '22:00', false),  -- Rabu
  (4, '10:00', '22:00', false),  -- Kamis
  (5, '13:00', '22:00', false),  -- Jumat (buka sore)
  (6, '10:00', '22:00', false)   -- Sabtu
on conflict (day_of_week) do nothing;
