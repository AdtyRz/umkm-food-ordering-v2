-- ============================================================
-- 001_initial.sql — Skema untuk MySQL / MariaDB (XAMPP)
-- Aplikasi Pemesanan Makanan UMKM Realtime (development)
--
-- Dijalankan otomatis oleh: node scripts/setup-db.mjs
-- Catatan: UUID dibuat oleh aplikasi (Drizzle), bukan DEFAULT.
-- ============================================================

SET NAMES utf8mb4;

-- ---------- ADMIN USERS (auth lokal — saat deploy diganti Supabase Auth) ----------
CREATE TABLE IF NOT EXISTS admin_users (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- CUSTOMERS (tanpa password/auth) ----------
CREATE TABLE IF NOT EXISTS customers (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  name       VARCHAR(120) NULL,
  phone      VARCHAR(32)  NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- CUSTOMER SESSIONS ----------
-- Token mentah TIDAK disimpan, hanya hash SHA-256.
-- session_id adalah UUID acak yang dipakai sebagai klaim JWT realtime.
CREATE TABLE IF NOT EXISTS customer_sessions (
  id                 CHAR(36)  NOT NULL PRIMARY KEY,
  customer_id        CHAR(36)  NOT NULL,
  session_id         CHAR(36)  NOT NULL UNIQUE,
  customer_token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at         TIMESTAMP NOT NULL,
  revoked_at         TIMESTAMP NULL,
  last_activity_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE CASCADE,
  INDEX idx_sessions_customer (customer_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- CATEGORIES ----------
CREATE TABLE IF NOT EXISTS categories (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- PRODUCTS ----------
CREATE TABLE IF NOT EXISTS products (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  category_id  CHAR(36)      NULL,
  name         VARCHAR(150)  NOT NULL,
  slug         VARCHAR(180)  NOT NULL UNIQUE,
  description  TEXT          NULL,
  price        DECIMAL(12,2) NOT NULL,
  image_path   VARCHAR(500)  NULL,
  stock_status ENUM('many','low','out') NOT NULL DEFAULT 'many',
  is_available TINYINT(1)    NOT NULL DEFAULT 1,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT chk_products_price CHECK (price >= 0),
  INDEX idx_products_category (category_id),
  INDEX idx_products_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- PROMOS ----------
CREATE TABLE IF NOT EXISTS promos (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  name              VARCHAR(120)  NOT NULL,
  code              VARCHAR(40)   NOT NULL UNIQUE,
  type              ENUM('percentage','fixed_amount') NOT NULL,
  value             DECIMAL(12,2) NOT NULL,
  minimum_purchase  DECIMAL(12,2) NOT NULL DEFAULT 0,
  maximum_discount  DECIMAL(12,2) NULL,
  starts_at         TIMESTAMP     NULL,
  ends_at           TIMESTAMP     NULL,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_promo_value CHECK (value > 0),
  CONSTRAINT chk_promo_min CHECK (minimum_purchase >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- ORDERS ----------
CREATE TABLE IF NOT EXISTS orders (
  id             CHAR(36)      NOT NULL PRIMARY KEY,
  order_token    VARCHAR(20)   NOT NULL UNIQUE,
  customer_id    CHAR(36)      NOT NULL,
  session_id     CHAR(36)      NULL,
  subtotal       DECIMAL(12,2) NOT NULL,
  discount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  total          DECIMAL(12,2) NOT NULL,
  promo_id       CHAR(36)      NULL,
  payment_method ENUM('qris','cod') NOT NULL,
  payment_status ENUM('pending','waiting_verification','paid','failed') NOT NULL DEFAULT 'pending',
  order_status   ENUM('pending','approved','processing','ready','delivering','completed','rejected','cancelled') NOT NULL DEFAULT 'pending',
  customer_note  TEXT          NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_promo FOREIGN KEY (promo_id)
    REFERENCES promos (id) ON DELETE SET NULL,
  CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
  CONSTRAINT chk_orders_discount CHECK (discount >= 0),
  CONSTRAINT chk_orders_total CHECK (total >= 0),
  INDEX idx_orders_customer (customer_id),
  INDEX idx_orders_session (session_id),
  INDEX idx_orders_status (order_status),
  INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- ORDER ITEMS (snapshot nama & harga produk) ----------
CREATE TABLE IF NOT EXISTS order_items (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  order_id      CHAR(36)      NOT NULL,
  product_id    CHAR(36)      NULL,
  product_name  VARCHAR(150)  NOT NULL,
  product_price DECIMAL(12,2) NOT NULL,
  quantity      INT           NOT NULL,
  subtotal      DECIMAL(12,2) NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT chk_items_qty CHECK (quantity > 0),
  INDEX idx_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- ORDER STATUS HISTORIES (append-only) ----------
CREATE TABLE IF NOT EXISTS order_status_histories (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  order_id   CHAR(36) NOT NULL,
  status     ENUM('pending','approved','processing','ready','delivering','completed','rejected','cancelled') NOT NULL,
  note       TEXT     NULL,
  changed_by VARCHAR(120) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_histories_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  INDEX idx_histories_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- PAYMENTS ----------
CREATE TABLE IF NOT EXISTS payments (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  order_id    CHAR(36)     NOT NULL,
  method      ENUM('qris','cod') NOT NULL,
  status      ENUM('pending','waiting_verification','paid','failed') NOT NULL DEFAULT 'pending',
  reference   VARCHAR(255) NULL,
  proof_path  VARCHAR(500) NULL,
  verified_by VARCHAR(120) NULL,
  verified_at TIMESTAMP    NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  INDEX idx_payments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- PROMO USAGES ----------
CREATE TABLE IF NOT EXISTS promo_usages (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  promo_id        CHAR(36)      NOT NULL,
  order_id        CHAR(36)      NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usage_promo FOREIGN KEY (promo_id)
    REFERENCES promos (id) ON DELETE CASCADE,
  CONSTRAINT fk_usage_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  UNIQUE KEY uq_promo_order (promo_id, order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- STORE SETTINGS (single row, id = 1) ----------
CREATE TABLE IF NOT EXISTS store_settings (
  id                  TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  store_name          VARCHAR(120)  NOT NULL DEFAULT 'Kedai Rasa',
  description         TEXT          NULL,
  logo_path           VARCHAR(500)  NULL,
  phone               VARCHAR(32)   NULL,
  whatsapp            VARCHAR(32)   NULL,
  email               VARCHAR(255)  NULL,
  address             VARCHAR(500)  NULL,
  latitude            DOUBLE        NULL,
  longitude           DOUBLE        NULL,
  store_status_mode   ENUM('automatic','force_open','force_closed') NOT NULL DEFAULT 'automatic',
  manual_store_status TINYINT(1)    NOT NULL DEFAULT 0,
  timezone            VARCHAR(64)   NOT NULL DEFAULT 'Asia/Jakarta',
  qris_image_path     VARCHAR(500)  NULL,
  qris_receiver_name  VARCHAR(120)  NULL,
  cod_enabled         TINYINT(1)    NOT NULL DEFAULT 1,
  developer_name      VARCHAR(120)  NULL,
  developer_info      VARCHAR(255)  NULL,
  developer_contact   VARCHAR(255)  NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_settings_id CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- STORE OPERATING HOURS (7 hari, 0 = Minggu) ----------
CREATE TABLE IF NOT EXISTS store_operating_hours (
  id          CHAR(36)   NOT NULL PRIMARY KEY,
  day_of_week TINYINT    NOT NULL UNIQUE,
  open_time   TIME       NOT NULL DEFAULT '09:00:00',
  close_time  TIME       NOT NULL DEFAULT '21:00:00',
  is_closed   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_hours_day CHECK (day_of_week BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
