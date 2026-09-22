import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  timestamp,
  doublePrecision,
  time,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------- ENUMS ----------
export const stockStatusEnum = pgEnum('stock_status', ['many', 'low', 'out']);
export const promoTypeEnum = pgEnum('promo_type', ['percentage', 'fixed_amount']);
export const paymentMethodEnum = pgEnum('payment_method', ['qris', 'cod']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'waiting_verification',
  'paid',
  'failed',
]);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'approved',
  'processing',
  'ready',
  'delivering',
  'completed',
  'rejected',
  'cancelled',
]);
export const storeStatusModeEnum = pgEnum('store_status_mode', [
  'automatic',
  'force_open',
  'force_closed',
]);

// ---------- HELPER COLUMNS ----------
const id = () => uuid('id').defaultRandom().primaryKey();
const createdAt = () =>
timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

// ---------- ADMIN PROFILES (Supabase Auth) ----------
export const adminProfiles = pgTable('admin_profiles', {
  id: id(),
                                     userId: uuid('user_id').notNull().unique(),
                                     name: text('name').notNull(),
                                     role: text('role').notNull().default('admin'),
                                     createdAt: createdAt(),
                                     updatedAt: updatedAt(),
});

// ---------- CUSTOMERS & SESSIONS ----------
export const customers = pgTable('customers', {
  id: id(),
                                 name: text('name'),
                                 phone: text('phone'),
                                 createdAt: createdAt(),
                                 updatedAt: updatedAt(),
});

export const customerSessions = pgTable(
  'customer_sessions',
  {
    id: id(),
                                        customerId: uuid('customer_id')
                                        .notNull()
                                        .references(() => customers.id, { onDelete: 'cascade' }),
                                        sessionId: uuid('session_id').defaultRandom().notNull().unique(),
                                        customerTokenHash: text('customer_token_hash').notNull().unique(),
                                        expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
                                        revokedAt: timestamp('revoked_at', { withTimezone: true }),
                                        lastActivityAt: timestamp('last_activity_at', { withTimezone: true })
                                        .defaultNow()
                                        .notNull(),
                                        createdAt: createdAt(),
                                        updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_customer_sessions_customer').on(t.customerId),
                                        index('idx_customer_sessions_expires').on(t.expiresAt),
  ]
);

// ---------- CATEGORIES ----------
export const categories = pgTable('categories', {
  id: id(),
                                  name: text('name').notNull(),
                                  slug: text('slug').notNull().unique(),
                                  description: text('description'),
                                  sortOrder: integer('sort_order').default(0).notNull(),
                                  isActive: boolean('is_active').default(true).notNull(),
                                  createdAt: createdAt(),
                                  updatedAt: updatedAt(),
});

// ---------- PRODUCTS ----------
export const products = pgTable(
  'products',
  {
    id: id(),
                                categoryId: uuid('category_id').references(() => categories.id, {
                                  onDelete: 'set null',
                                }),
                                name: text('name').notNull(),
                                slug: text('slug').notNull().unique(),
                                description: text('description'),
                                price: numeric('price', { precision: 12, scale: 2 }).notNull(),
                                imagePath: text('image_path'),
                                stockStatus: stockStatusEnum('stock_status').default('many').notNull(),
                                isAvailable: boolean('is_available').default(true).notNull(),
                                createdAt: createdAt(),
                                updatedAt: updatedAt(),
  },
  (t) => [
    index('idx_products_category').on(t.categoryId),
                                index('idx_products_available').on(t.isAvailable),
  ]
);

// ---------- PROMOS ----------
export const promos = pgTable('promos', {
  id: id(),
                              name: text('name').notNull(),
                              code: text('code').notNull().unique(),
                              type: promoTypeEnum('type').notNull(),
                              value: numeric('value', { precision: 12, scale: 2 }).notNull(),
                              minimumPurchase: numeric('minimum_purchase', { precision: 12, scale: 2 })
                              .default('0')
                              .notNull(),
                              maximumDiscount: numeric('maximum_discount', { precision: 12, scale: 2 }),
                              startsAt: timestamp('starts_at', { withTimezone: true }),
                              endsAt: timestamp('ends_at', { withTimezone: true }),
                              isActive: boolean('is_active').default(true).notNull(),
                              createdAt: createdAt(),
                              updatedAt: updatedAt(),
});

// ---------- ORDERS ----------
export const orders = pgTable(
  'orders',
  {
    id: id(),
                              orderToken: text('order_token').notNull().unique(),
                              customerId: uuid('customer_id')
                              .notNull()
                              .references(() => customers.id, { onDelete: 'restrict' }),
                              sessionId: uuid('session_id').references(
                                () => customerSessions.sessionId,
                                                                       { onDelete: 'set null' }
                              ),
                              subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
                              discount: numeric('discount', { precision: 12, scale: 2 })
                              .default('0')
                              .notNull(),
                              total: numeric('total', { precision: 12, scale: 2 }).notNull(),
                              promoId: uuid('promo_id').references(() => promos.id, {
                                onDelete: 'set null',
                              }),
                              paymentMethod: paymentMethodEnum('payment_method').notNull(),
                              paymentStatus: paymentStatusEnum('payment_status')
                              .default('pending')
                              .notNull(),
                              orderStatus: orderStatusEnum('order_status')
                              .default('pending')
                              .notNull(),
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

// ---------- PROMO USAGES ----------
export const promoUsages = pgTable(
  'promo_usages',
  {
    id: id(),
                                   promoId: uuid('promo_id')
                                   .notNull()
                                   .references(() => promos.id, { onDelete: 'cascade' }),
                                   orderId: uuid('order_id')
                                   .notNull()
                                   .references(() => orders.id, { onDelete: 'cascade' }),
                                   discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull(),
                                   createdAt: timestamp('created_at', { withTimezone: true })
                                   .defaultNow()
                                   .notNull(),
  },
  (t) => [uniqueIndex('uq_promo_order').on(t.promoId, t.orderId)]
);

// ---------- ORDER ITEMS ----------
export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
                                  orderId: uuid('order_id')
                                  .notNull()
                                  .references(() => orders.id, { onDelete: 'cascade' }),
                                  productId: uuid('product_id').references(() => products.id, {
                                    onDelete: 'set null',
                                  }),
                                  productName: text('product_name').notNull(),
                                  productPrice: numeric('product_price', {
                                    precision: 12,
                                    scale: 2,
                                  }).notNull(),
                                  quantity: integer('quantity').notNull(),
                                  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
                                  createdAt: createdAt(),
                                  updatedAt: updatedAt(),
  },
  (t) => [index('idx_order_items_order').on(t.orderId)]
);

// ---------- ORDER STATUS HISTORIES ----------
export const orderStatusHistories = pgTable(
  'order_status_histories',
  {
    id: id(),
                                            orderId: uuid('order_id')
                                            .notNull()
                                            .references(() => orders.id, { onDelete: 'cascade' }),
                                            status: orderStatusEnum('status').notNull(),
                                            note: text('note'),
                                            changedBy: text('changed_by').default('system').notNull(),
                                            createdAt: timestamp('created_at', { withTimezone: true })
                                            .defaultNow()
                                            .notNull(),
  },
  (t) => [index('idx_order_histories_order').on(t.orderId)]
);

// ---------- PAYMENTS ----------
export const payments = pgTable(
  'payments',
  {
    id: id(),
                                orderId: uuid('order_id')
                                .notNull()
                                .references(() => orders.id, { onDelete: 'cascade' }),
                                method: paymentMethodEnum('method').notNull(),
                                status: paymentStatusEnum('status').default('pending').notNull(),
                                reference: text('reference'),
                                proofPath: text('proof_path'),
                                verifiedBy: text('verified_by'),
                                verifiedAt: timestamp('verified_at', { withTimezone: true }),
                                createdAt: createdAt(),
                                updatedAt: updatedAt(),
  },
  (t) => [index('idx_payments_order').on(t.orderId)]
);

// ---------- STORE SETTINGS ----------
export const storeSettings = pgTable('store_settings', {
  id: integer('id').default(1).primaryKey(),
                                     storeName: text('store_name').default('Kedai Rasa').notNull(),
                                     description: text('description'),
                                     logoPath: text('logo_path'),
                                     phone: text('phone'),
                                     whatsapp: text('whatsapp'),
                                     email: text('email'),
                                     address: text('address'),
                                     latitude: doublePrecision('latitude'),
                                     longitude: doublePrecision('longitude'),
                                     storeStatusMode: storeStatusModeEnum('store_status_mode')
                                     .default('automatic')
                                     .notNull(),
                                     manualStoreStatus: boolean('manual_store_status').default(false).notNull(),
                                     timezone: text('timezone').default('Asia/Jakarta').notNull(),
                                     qrisImagePath: text('qris_image_path'),
                                     qrisReceiverName: text('qris_receiver_name'),
                                     codEnabled: boolean('cod_enabled').default(true).notNull(),
                                     // Bot WA: nomor perangkat pengirim (Fonnte dkk.) + saklar aktif.
                                     // Nonaktif → notifikasi fallback ke kirim manual admin.
                                     waBotNumber: text('wa_bot_number'),
                                     waBotEnabled: boolean('wa_bot_enabled').default(false).notNull(),
                                     developerName: text('developer_name'),
                                     developerInfo: text('developer_info'),
                                     developerContact: text('developer_contact'),
                                     createdAt: createdAt(),
                                     updatedAt: updatedAt(),
});

// ---------- STORE OPERATING HOURS ----------
export const storeOperatingHours = pgTable('store_operating_hours', {
  id: id(),
                                           dayOfWeek: integer('day_of_week').notNull().unique(),
                                           openTime: time('open_time').default('09:00').notNull(),
                                           closeTime: time('close_time').default('21:00').notNull(),
                                           isClosed: boolean('is_closed').default(false).notNull(),
                                           createdAt: createdAt(),
                                           updatedAt: updatedAt(),
});

// ---------- RELATIONS ----------
export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
                                                                     payments: many(payments),
                                                                     histories: many(orderStatusHistories),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ---------- TYPES ----------
export type AdminProfile = typeof adminProfiles.$inferSelect;
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
