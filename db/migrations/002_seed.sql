-- ============================================================
-- 002_seed.sql — Data awal
-- Dijalankan otomatis oleh scripts/setup-db.mjs
-- (Admin user di-insert oleh script dengan bcrypt hash)
-- ============================================================

-- ---------- KATEGORI ----------
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  (UUID(), 'Makanan', 'makanan', 'Menu makanan utama', 1),
  (UUID(), 'Minuman', 'minuman', 'Aneka minuman segar', 2),
  (UUID(), 'Snack', 'snack', 'Camilan untuk teman ngopi', 3),
  (UUID(), 'Paket', 'paket', 'Paket hemat hemat kantong', 4);

-- ---------- JAM OPERASIONAL (0 = Minggu) ----------
INSERT INTO store_operating_hours (id, day_of_week, open_time, close_time, is_closed) VALUES
  (UUID(), 0, '10:00:00', '22:00:00', 1),  -- Minggu tutup
  (UUID(), 1, '10:00:00', '22:00:00', 0),
  (UUID(), 2, '10:00:00', '22:00:00', 0),
  (UUID(), 3, '10:00:00', '22:00:00', 0),
  (UUID(), 4, '10:00:00', '22:00:00', 0),
  (UUID(), 5, '13:00:00', '22:00:00', 0),  -- Jumat buka 13:00
  (UUID(), 6, '10:00:00', '22:00:00', 0);

-- ---------- PENGATURAN TOKO ----------
INSERT INTO store_settings (
  id, store_name, description, phone, whatsapp, email, address,
  latitude, longitude, store_status_mode, manual_store_status,
  qris_receiver_name, cod_enabled,
  developer_name, developer_info, developer_contact
) VALUES (
  1,
  'Kedai Rasa',
  'Dapur rumahan dengan masakan nusantara otentik. Semua dimasak fresh setiap hari!',
  '6281234567890',
  '6281234567890',
  'hello@kedairasa.id',
  'Jl. Merdeka No. 123, Bandung, Jawa Barat',
  -6.914744,
  107.609811,
  'automatic',
  0,
  'Kedai Rasa',
  1,
  'Aditya Riqi',
  'Full-stack developer yang suka ngopi sambil ngoding',
  'https://github.com/adityariqi'
);

-- ---------- PRODUK CONTOH ----------
INSERT INTO products (id, category_id, name, slug, description, price, stock_status, is_available)
SELECT UUID(), c.id, v.name, v.slug, v.description, v.price, v.stock, 1
FROM (
  SELECT 'Nasi Goreng Spesial' AS name, 'nasi-goreng-spesial' AS slug,
         'Nasi goreng dengan telur, ayam, dan kerupuk. Level pedas bisa request!' AS description,
         25000.00 AS price, 'many' AS stock
  UNION ALL SELECT 'Mie Goreng Jawa', 'mie-goreng-jawa',
         'Mie goreng gaya Jawa dengan sayuran segar dan bumbu racikan sendiri.',
         22000.00, 'many'
  UNION ALL SELECT 'Ayam Geprek Sambal Bawang', 'ayam-geprek-sambal-bawang',
         'Ayam crispy digeprek dengan sambal bawang pedas nampol.',
         23000.00, 'many'
  UNION ALL SELECT 'Soto Ayam Lamongan', 'soto-ayam-lamongan',
         'Soto ayam bening dengan koya, suwiran ayam, dan telur rebus.',
         20000.00, 'many'
  UNION ALL SELECT 'Es Teh Manis', 'es-teh-manis',
         'Teh manis dingin segar, cocok nemenin makan apa aja.',
         5000.00, 'many'
  UNION ALL SELECT 'Es Jeruk Peras', 'es-jeruk-peras',
         'Jeruk peras asli tanpa pemanis buatan.',
         8000.00, 'many'
  UNION ALL SELECT 'Kopi Susu Gula Aren', 'kopi-susu-gula-aren',
         'Espresso, susu segar, dan gula aren asli.',
         18000.00, 'many'
  UNION ALL SELECT 'Pisang Goreng Keju', 'pisang-goreng-keju',
         'Pisang goreng crispy topping keju dan susu kental manis.',
         15000.00, 'low'
  UNION ALL SELECT 'Roti Bakar Cokelat', 'roti-bakar-cokelat',
         'Roti bakar dengan lelehan cokelat lumer.',
         12000.00, 'out'
) AS v
JOIN categories c ON c.slug = CASE v.slug
  WHEN 'es-teh-manis' THEN 'minuman'
  WHEN 'es-jeruk-peras' THEN 'minuman'
  WHEN 'kopi-susu-gula-aren' THEN 'minuman'
  WHEN 'pisang-goreng-keju' THEN 'snack'
  WHEN 'roti-bakar-cokelat' THEN 'snack'
  ELSE 'makanan'
END;

-- ---------- PROMO CONTOH ----------
INSERT INTO promos (id, name, code, type, value, minimum_purchase, maximum_discount, starts_at, ends_at, is_active)
VALUES
  (UUID(), 'Diskon 10%', 'HEMAT10', 'percentage', 10.00, 30000.00, 10000.00,
   NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 90 DAY, 1),
  (UUID(), 'Potongan 5000', 'JOMPOT5', 'fixed_amount', 5000.00, 25000.00, NULL,
   NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 90 DAY, 1);
