/**
 * Drizzle ORM schema — MySQL/MariaDB (development via XAMPP).
 * Selaras dengan db/migrations/001_initial.sql.
 */
import {
  boolean,
  char,
  decimal,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

// UUID v4 dibuat di sisi aplikasi (kompatibel MySQL & memudahkan migrasi)
const id = () =>
  char('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp('created_at').notNull().defaultNow();
const updatedAt = () => timestamp('updated_at').notNull().defaultNow();

// ---------- ADMIN USERS ----------
export const adminUsers = mysqlTable('admin_users', {
  id: id(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('admin'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- CUSTOMERS & SESSIONS ----------
export const customers = mysqlTable('customers', {
  id: id(),
  name: varchar('name', { length: 120 }),
  phone: varchar('phone', { length: 32 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customerSessions = mysqlTable(
  'customer_sessions',
  {
    id: id(),
    customerId: char('customer_id', { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    sessionId: char('session_id', { length: 36 }).notNull().unique(),
    customerTokenHash: varchar('customer_token_hash', { length: 64 })
      .notNull()
      .unique(),
    expiresAt: timestamp('expires_at').notNull(),
    /** Non-null → session sudah hangus (pesanan selesai / dicabut). */
    revokedAt: timestamp('revoked_at'),
    lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_sessions_customer').on(t.customerId),
    index('idx_sessions_expires').on(t.expiresAt),
  ]
);

// ---------- CATEGORIES ----------
export const categories = mysqlTable('categories', {
  id: id(),
  name: varchar('name', { length: 80 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  sortOrder: int('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- PRODUCTS ----------
export const products = mysqlTable(
  'products',
  {
    id: id(),
    categoryId: char('category_id', { length: 36 }).references(
      () => categories.id,
      { onDelete: 'set null' }
    ),
    name: varchar('name', { length: 150 }).notNull(),
    slug: varchar('slug', { length: 180 }).notNull().unique(),
    description: text('description'),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    imagePath: varchar('image_path', { length: 500 }),
    stockStatus: mysqlEnum('stock_status', ['many', 'low', 'out'])
      .notNull()
      .default('many'),
    isAvailable: boolean('is_available').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_products_category').on(t.categoryId),
    index('idx_products_available').on(t.isAvailable),
  ]
);

// ---------- PROMOS ----------
export const promos = mysqlTable('promos', {
  id: id(),
  name: varchar('name', { length: 120 }).notNull(),
  code: varchar('code', { length: 40 }).notNull().unique(),
  type: mysqlEnum('type', ['percentage', 'fixed_amount']).notNull(),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  minimumPurchase: decimal('minimum_purchase', { precision: 12, scale: 2 })
    .notNull()
    .default('0'),
  maximumDiscount: decimal('maximum_discount', { precision: 12, scale: 2 }),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- ORDERS ----------
export const orders = mysqlTable(
  'orders',
  {
    id: id(),
    orderToken: varchar('order_token', { length: 20 }).notNull().unique(),
    customerId: char('customer_id', { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    sessionId: char('session_id', { length: 36 }),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    discount: decimal('discount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: decimal('total', { precision: 12, scale: 2 }).notNull(),
    promoId: char('promo_id', { length: 36 }).references(() => promos.id, {
      onDelete: 'set null',
    }),
    paymentMethod: mysqlEnum('payment_method', ['qris', 'cod']).notNull(),
    paymentStatus: mysqlEnum('payment_status', [
      'pending',
      'waiting_verification',
      'paid',
      'failed',
    ])
      .notNull()
      .default('pending'),
    orderStatus: mysqlEnum('order_status', [
      'pending',
      'approved',
      'processing',
      'ready',
      'delivering',
      'completed',
      'rejected',
      'cancelled',
    ])
      .notNull()
      .default('pending'),
    customerNote: text('customer_note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_orders_customer').on(t.customerId),
    index('idx_orders_session').on(t.sessionId),
    index('idx_orders_status').on(t.orderStatus),
    index('idx_orders_created_at').on(t.createdAt),
  ]
);

// ---------- ORDER ITEMS ----------
export const orderItems = mysqlTable(
  'order_items',
  {
    id: id(),
    orderId: char('order_id', { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: char('product_id', { length: 36 }).references(
      () => products.id,
      { onDelete: 'set null' }
    ),
    productName: varchar('product_name', { length: 150 }).notNull(),
    productPrice: decimal('product_price', { precision: 12, scale: 2 }).notNull(),
    quantity: int('quantity').notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_items_order').on(t.orderId)]
);

// ---------- ORDER STATUS HISTORIES ----------
export const orderStatusHistories = mysqlTable(
  'order_status_histories',
  {
    id: id(),
    orderId: char('order_id', { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: mysqlEnum('status', [
      'pending',
      'approved',
      'processing',
      'ready',
      'delivering',
      'completed',
      'rejected',
      'cancelled',
    ]).notNull(),
    note: text('note'),
    changedBy: varchar('changed_by', { length: 120 }).notNull().default('system'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('idx_histories_order').on(t.orderId)]
);

// ---------- PAYMENTS ----------
export const payments = mysqlTable(
  'payments',
  {
    id: id(),
    orderId: char('order_id', { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    method: mysqlEnum('method', ['qris', 'cod']).notNull(),
    status: mysqlEnum('status', [
      'pending',
      'waiting_verification',
      'paid',
      'failed',
    ])
      .notNull()
      .default('pending'),
    reference: varchar('reference', { length: 255 }),
    proofPath: varchar('proof_path', { length: 500 }),
    verifiedBy: varchar('verified_by', { length: 120 }),
    verifiedAt: timestamp('verified_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('idx_payments_order').on(t.orderId)]
);

// ---------- PROMO USAGES ----------
export const promoUsages = mysqlTable(
  'promo_usages',
  {
    id: id(),
    promoId: char('promo_id', { length: 36 })
      .notNull()
      .references(() => promos.id, { onDelete: 'cascade' }),
    orderId: char('order_id', { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('uq_promo_order').on(t.promoId, t.orderId)]
);

// ---------- STORE SETTINGS ----------
export const storeSettings = mysqlTable('store_settings', {
  id: tinyint('id', { unsigned: true }).primaryKey(),
  storeName: varchar('store_name', { length: 120 }).notNull().default('Kedai Rasa'),
  description: text('description'),
  logoPath: varchar('logo_path', { length: 500 }),
  phone: varchar('phone', { length: 32 }),
  whatsapp: varchar('whatsapp', { length: 32 }),
  email: varchar('email', { length: 255 }),
  address: varchar('address', { length: 500 }),
  latitude: double('latitude'),
  longitude: double('longitude'),
  storeStatusMode: mysqlEnum('store_status_mode', [
    'automatic',
    'force_open',
    'force_closed',
  ])
    .notNull()
    .default('automatic'),
  manualStoreStatus: boolean('manual_store_status').notNull().default(false),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Jakarta'),
  qrisImagePath: varchar('qris_image_path', { length: 500 }),
  qrisReceiverName: varchar('qris_receiver_name', { length: 120 }),
  codEnabled: boolean('cod_enabled').notNull().default(true),
  developerName: varchar('developer_name', { length: 120 }),
  developerInfo: varchar('developer_info', { length: 255 }),
  developerContact: varchar('developer_contact', { length: 255 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- STORE OPERATING HOURS ----------
export const storeOperatingHours = mysqlTable('store_operating_hours', {
  id: id(),
  dayOfWeek: tinyint('day_of_week').notNull().unique(),
  openTime: time('open_time').notNull().default('09:00:00'),
  closeTime: time('close_time').notNull().default('21:00:00'),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------- TYPES ----------
export type AdminUser = typeof adminUsers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type CustomerSession = typeof customerSessions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Promo = typeof promos.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistories.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
export type StoreOperatingHour = typeof storeOperatingHours.$inferSelect;
