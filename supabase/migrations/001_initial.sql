-- ============================================================
-- 001_initial.sql — Schema, Index, Trigger, RLS
-- Aplikasi Pemesanan Makanan UMKM Realtime
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type stock_status as enum ('many', 'low', 'out');
create type promo_type as enum ('percentage', 'fixed_amount');
create type payment_method as enum ('qris', 'cod');
create type payment_status as enum ('pending', 'waiting_verification', 'paid', 'failed');
create type order_status as enum (
  'pending',        -- Menunggu Persetujuan
  'approved',       -- Disetujui
  'processing',     -- Diproses
  'ready',          -- Siap
  'delivering',     -- Diantarkan
  'completed',      -- Selesai
  'rejected',       -- Ditolak
  'cancelled'       -- Dibatalkan
);
create type store_status_mode as enum ('automatic', 'force_open', 'force_closed');

-- ============================================================
-- ADMIN PROFILES (relasi ke Supabase Auth)
-- ============================================================
create table admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS (tanpa password/auth)
-- ============================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CUSTOMER SESSIONS
-- Token mentah TIDAK disimpan — hanya SHA-256 hash.
-- session_id adalah UUID acak yang dikirim ke client sebagai
-- klaim pada JWT realtime (lihat 005_realtime_helpers.sql).
-- ============================================================
create table customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  session_id uuid not null unique default gen_random_uuid(),
  customer_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz, -- non-null → session hangus (pesanan selesai)
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customer_sessions_customer on customer_sessions(customer_id);
create index idx_customer_sessions_expires on customer_sessions(expires_at);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  image_path text,
  stock_status stock_status not null default 'many',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_products_category on products(category_id);
create index idx_products_available on products(is_available);

-- ============================================================
-- PROMOS & PROMO USAGES (didefinisikan sebelum orders
-- karena orders memiliki FK promo_id)
-- ============================================================
create table promos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  type promo_type not null,
  value numeric(12, 2) not null check (value > 0),
  minimum_purchase numeric(12, 2) not null default 0 check (minimum_purchase >= 0),
  maximum_discount numeric(12, 2) check (maximum_discount is null or maximum_discount > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table promo_usages (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references promos(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  discount_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (promo_id, order_id)
);

-- ============================================================
-- ORDERS
-- ============================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_token text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  session_id uuid references customer_sessions(session_id) on delete set null,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null check (total >= 0),
  promo_id uuid references promos(id) on delete set null,
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  order_status order_status not null default 'pending',
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_session on orders(session_id);
create index idx_orders_status on orders(order_status);
create index idx_orders_created_at on orders(created_at);

-- ============================================================
-- ORDER ITEMS (snapshot nama & harga produk)
-- ============================================================
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  product_price numeric(12, 2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_order_items_order on order_items(order_id);

-- ============================================================
-- ORDER STATUS HISTORIES (append-only)
-- ============================================================
create table order_status_histories (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  changed_by text not null default 'system',
  created_at timestamptz not null default now()
);
create index idx_order_histories_order on order_status_histories(order_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  status payment_status not null default 'pending',
  reference text,
  proof_path text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payments_order on payments(order_id);

-- ============================================================
-- STORE SETTINGS (single row)
-- ============================================================
create table store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Kedai Rasa',
  description text,
  logo_path text,
  phone text,
  whatsapp text,
  email text,
  address text,
  latitude double precision,
  longitude double precision,
  store_status_mode store_status_mode not null default 'automatic',
  manual_store_status boolean not null default false,
  timezone text not null default 'Asia/Jakarta',
  qris_image_path text,
  qris_receiver_name text,
  cod_enabled boolean not null default true,
  developer_name text,
  developer_info text,
  developer_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- STORE OPERATING HOURS (7 hari)
-- ============================================================
create table store_operating_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null unique check (day_of_week between 0 and 6), -- 0=Minggu
  open_time time not null default '09:00',
  close_time time not null default '21:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS — updated_at otomatis
-- ============================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'admin_profiles', 'customers', 'customer_sessions', 'categories',
    'products', 'orders', 'order_items', 'payments', 'promos',
    'store_settings', 'store_operating_hours'
  ]
  loop
    execute format('
      create trigger trg_%s_updated_at
      before update on %I
      for each row execute function set_updated_at();
    ', t, t);
  end loop;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Prinsip:
--   * Public (anon)  → hanya data publik toko & produk aktif
--   * Customer       → TIDAK punya akses DB mentah ke data sensitif.
--                      Order dibaca via realtime dengan JWT khusus
--                      yang membawa session_id (policy di bawah).
--   * Authenticated  → hanya admin; diperiksa lewat helper is_admin().
-- ============================================================
alter table admin_profiles        enable row level security;
alter table customers             enable row level security;
alter table customer_sessions     enable row level security;
alter table categories            enable row level security;
alter table products              enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table order_status_histories enable row level security;
alter table payments              enable row level security;
alter table promos                enable row level security;
alter table promo_usages          enable row level security;
alter table store_settings        enable row level security;
alter table store_operating_hours enable row level security;

-- Helper: user saat ini admin?
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles ap
    where ap.user_id = auth.uid()
  );
$$;

-- Helper: apakah JWT membawa session_id yang cocok?
-- Dipakai di policy dengan kolom tabel sebagai argumen,
-- mis. select using (order_session_matches(session_id)).
create or replace function order_session_matches(p_session_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'session_id' = p_session_id::text,
    false
  );
$$;

-- ---------- PUBLIC READ (data publik) ----------
create policy "public_read_categories" on categories
  for select using (is_active = true);

create policy "public_read_products" on products
  for select using (true);

create policy "public_read_store_settings" on store_settings
  for select using (true);

create policy "public_read_operating_hours" on store_operating_hours
  for select using (true);

create policy "public_read_active_promos" on promos
  for select using (is_active = true);

-- ---------- ADMIN ----------
create policy "admin_all_categories" on categories
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_products" on products
  for all using (is_admin()) with check (is_admin());

create policy "admin_read_admin_profiles" on admin_profiles
  for select using (user_id = auth.uid() or is_admin());

create policy "admin_insert_own_profile" on admin_profiles
  for insert with check (user_id = auth.uid());

create policy "admin_all_promos" on promos
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_store_settings" on store_settings
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_operating_hours" on store_operating_hours
  for all using (is_admin()) with check (is_admin());

create policy "admin_read_customers" on customers
  for select using (is_admin());

create policy "admin_read_orders" on orders
  for select using (is_admin());

create policy "admin_update_orders" on orders
  for update using (is_admin()) with check (is_admin());

create policy "admin_read_order_items" on order_items
  for select using (is_admin());

create policy "admin_read_histories" on order_status_histories
  for select using (is_admin());

create policy "admin_insert_histories" on order_status_histories
  for insert with check (is_admin());

create policy "admin_read_payments" on payments
  for select using (is_admin());

create policy "admin_update_payments" on payments
  for update using (is_admin()) with check (is_admin());

create policy "admin_read_promo_usages" on promo_usages
  for select using (is_admin());

-- Customer realtime: order miliknya bisa dibaca via JWT session_id
create policy "customer_read_own_order_realtime" on orders
  for select using (order_session_matches(session_id));

create policy "customer_read_own_order_items_realtime" on order_items
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and order_session_matches(o.session_id)
    )
  );

create policy "customer_read_own_histories_realtime" on order_status_histories
  for select using (
    exists (
      select 1 from orders o
      where o.id = order_status_histories.order_id
        and order_session_matches(o.session_id)
    )
  );

create policy "customer_read_own_payments_realtime" on payments
  for select using (
    exists (
      select 1 from orders o
      where o.id = payments.order_id
        and order_session_matches(o.session_id)
    )
  );

-- Catatan keamanan:
-- customers & customer_sessions TIDAK memiliki policy apa pun →
-- tidak ada yang bisa membacanya lewat klien publik; hanya service role.

-- ============================================================
-- REALTIME PUBLICATION
-- Tambahkan tabel yang akan di-stream Supabase Realtime.
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table
    orders,
    order_items,
    order_status_histories,
    payments,
    products,
    store_settings;
end;
$$;
