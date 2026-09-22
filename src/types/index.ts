/** Tipe domain yang dipakai lintas aplikasi. */

export type StockStatus = 'many' | 'low' | 'out';
export type PromoType = 'percentage' | 'fixed_amount';
export type PaymentMethod = 'qris' | 'cod';
export type PaymentStatus =
  | 'pending'
  | 'waiting_verification'
  | 'paid'
  | 'failed';
export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'ready'
  | 'delivering'
  | 'completed'
  | 'rejected'
  | 'cancelled';
export type StoreStatusMode = 'automatic' | 'force_open' | 'force_closed';

/** Status toko hasil kalkulasi (untuk UI). */
export type StoreOpenStatus = {
  isOpen: boolean;
  source: 'automatic' | 'manual';
  message?: string | null;
  todayHours?: {
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  } | null;
};

export type ProductWithCategory = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imagePath: string | null;
  stockStatus: StockStatus;
  isAvailable: boolean;
};

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  imagePath: string | null;
  stockStatus: StockStatus;
  isAvailable: boolean;
};

export type AppliedPromo = {
  promoId: string;
  code: string;
  name: string;
  discount: number;
};

export type OrderWithDetails = {
  id: string;
  orderToken: string;
  customerId: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    productName: string;
    productPrice: number;
    quantity: number;
    subtotal: number;
  }[];
  histories?: {
    id: string;
    status: OrderStatus;
    note: string | null;
    changedBy: string;
    createdAt: string;
  }[];
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
    reference: string | null;
    proofPath: string | null;
    verifiedAt: string | null;
  } | null;
};

export type StoreInfo = {
  storeName: string;
  description: string | null;
  logoPath: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  storeStatusMode: StoreStatusMode;
  manualStoreStatus: boolean;
  timezone: string;
  qrisImagePath: string | null;
  qrisReceiverName: string | null;
  codEnabled: boolean;
  /** Bot WA: nomor perangkat pengirim + saklar aktif (fallback: kirim manual). */
  waBotNumber: string | null;
  waBotEnabled: boolean;
  developerName: string | null;
  developerInfo: string | null;
  developerContact: string | null;
};
