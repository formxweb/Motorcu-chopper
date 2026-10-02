import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/* Bu dosyada yol takma adı (@/) kullanılmaz: kurulum betiği de içe aktarıyor. */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export type UserRole = 'customer' | 'admin';

export type Address = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  line: string;
  zip: string;
};

export type BillingInfo = {
  type: 'individual' | 'corporate';
  sameAsShipping: boolean;
  address: Address;
  identityNumber: string;
  companyName: string;
  taxOffice: string;
  taxNumber: string;
};

export type ColorOption = { name: string; hex: string };

export type CustomField = {
  key: string;
  label: string;
  maxLength: number;
  required: boolean;
  placeholder: string;
};

export type Customization = Record<string, string>;
export type CustomizationLine = { label: string; value: string };

export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'refunded';

export type PaymentInfo = {
  cardFamily?: string;
  cardAssociation?: string;
  cardType?: string;
  lastFourDigits?: string;
  binNumber?: string;
  fraudStatus?: number;
  installment?: number;
  signatureOk?: boolean | null;
  errorMessage?: string;
  sandbox?: boolean;
};

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull().default(''),
    lastName: text('last_name').notNull().default(''),
    phone: text('phone').notNull().default(''),
    role: text('role').$type<UserRole>().notNull().default('customer'),
    marketingConsent: boolean('marketing_consent').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
    lastLoginAt: ts('last_login_at'),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const passwordResets = pgTable('password_resets', {
  id: text('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Adresim'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone').notNull(),
    city: text('city').notNull(),
    district: text('district').notNull(),
    line: text('line').notNull(),
    zip: text('zip').notNull().default(''),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('addresses_user_idx').on(t.userId)],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('categories_slug_uq').on(t.slug)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    summary: text('summary').notNull().default(''),
    description: text('description').notNull().default(''),
    details: jsonb('details').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    price: integer('price').notNull(),
    compareAtPrice: integer('compare_at_price'),
    badge: text('badge').notNull().default(''),
    colorLabel: text('color_label').notNull().default('Renk'),
    sizeLabel: text('size_label').notNull().default('Beden'),
    colors: jsonb('colors').$type<ColorOption[]>().notNull().default(sql`'[]'::jsonb`),
    sizes: jsonb('sizes').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    customFields: jsonb('custom_fields').$type<CustomField[]>().notNull().default(sql`'[]'::jsonb`),
    isPersonalized: boolean('is_personalized').notNull().default(false),
    trackStock: boolean('track_stock').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    seoTitle: text('seo_title').notNull().default(''),
    seoDescription: text('seo_description').notNull().default(''),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('products_slug_uq').on(t.slug), index('products_category_idx').on(t.categoryId)],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    thumbUrl: text('thumb_url').notNull(),
    alt: text('alt').notNull().default(''),
    color: text('color').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('product_images_product_idx').on(t.productId)],
);

export const variants = pgTable(
  'variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    color: text('color').notNull().default(''),
    size: text('size').notNull().default(''),
    sku: text('sku').notNull().default(''),
    stock: integer('stock').notNull().default(0),
    priceOverride: integer('price_override'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [uniqueIndex('variants_combo_uq').on(t.productId, t.color, t.size)],
);

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    discountCode: text('discount_code').notNull().default(''),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('carts_user_idx').on(t.userId)],
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => variants.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    customization: jsonb('customization').$type<Customization>().notNull().default(sql`'{}'::jsonb`),
    customizationKey: text('customization_key').notNull().default(''),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('cart_items_uq').on(t.cartId, t.variantId, t.customizationKey)],
);

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const discountCodes = pgTable(
  'discount_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    type: text('type').$type<'percent' | 'fixed'>().notNull(),
    value: integer('value').notNull(),
    minSubtotal: integer('min_subtotal').notNull().default(0),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    startsAt: ts('starts_at'),
    endsAt: ts('ends_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('discount_codes_code_uq').on(t.code)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    number: text('number').notNull(),
    accessToken: text('access_token').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    status: text('status').$type<OrderStatus>().notNull().default('pending_payment'),
    shippingAddress: jsonb('shipping_address').$type<Address>().notNull(),
    billing: jsonb('billing').$type<BillingInfo>().notNull(),
    note: text('note').notNull().default(''),
    subtotal: integer('subtotal').notNull(),
    discountTotal: integer('discount_total').notNull().default(0),
    shippingTotal: integer('shipping_total').notNull().default(0),
    total: integer('total').notNull(),
    paidTotal: integer('paid_total'),
    installment: integer('installment'),
    discountCode: text('discount_code').notNull().default(''),
    paymentToken: text('payment_token'),
    paymentId: text('payment_id'),
    paymentInfo: jsonb('payment_info').$type<PaymentInfo>(),
    paidAt: ts('paid_at'),
    carrier: text('carrier').notNull().default(''),
    trackingNumber: text('tracking_number').notNull().default(''),
    trackingUrl: text('tracking_url').notNull().default(''),
    shippedAt: ts('shipped_at'),
    deliveredAt: ts('delivered_at'),
    cancelledAt: ts('cancelled_at'),
    refundedAt: ts('refunded_at'),
    refundTotal: integer('refund_total').notNull().default(0),
    requestType: text('request_type').$type<'' | 'cancel' | 'return'>().notNull().default(''),
    requestNote: text('request_note').notNull().default(''),
    stockReserved: boolean('stock_reserved').notNull().default(false),
    cartId: uuid('cart_id'),
    contractsHtml: text('contracts_html').notNull().default(''),
    agreementsAcceptedAt: ts('agreements_accepted_at'),
    ip: text('ip').notNull().default(''),
    userAgent: text('user_agent').notNull().default(''),
    adminNote: text('admin_note').notNull().default(''),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('orders_number_uq').on(t.number),
    index('orders_status_idx').on(t.status),
    index('orders_user_idx').on(t.userId),
    index('orders_email_idx').on(t.email),
    index('orders_token_idx').on(t.paymentToken),
    index('orders_created_idx').on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: uuid('variant_id').references(() => variants.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(),
    productSlug: text('product_slug').notNull().default(''),
    color: text('color').notNull().default(''),
    size: text('size').notNull().default(''),
    colorLabel: text('color_label').notNull().default('Renk'),
    sizeLabel: text('size_label').notNull().default('Beden'),
    customization: jsonb('customization').$type<CustomizationLine[]>().notNull().default(sql`'[]'::jsonb`),
    isPersonalized: boolean('is_personalized').notNull().default(false),
    trackStock: boolean('track_stock').notNull().default(true),
    sku: text('sku').notNull().default(''),
    imageUrl: text('image_url').notNull().default(''),
    categoryName: text('category_name').notNull().default(''),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
    paymentTransactionId: text('payment_transaction_id'),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default(''),
    message: text('message').notNull(),
    isPublic: boolean('is_public').notNull().default(true),
    actor: text('actor').notNull().default('sistem'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    body: text('body').notNull(),
    authorName: text('author_name').notNull(),
    status: text('status').$type<'pending' | 'approved' | 'rejected'>().notNull().default('pending'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('reviews_user_product_uq').on(t.productId, t.userId)],
);

export const settings = pgTable('settings', {
  id: integer('id').primaryKey(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const emailLog = pgTable(
  'email_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    to: text('to').notNull(),
    subject: text('subject').notNull(),
    html: text('html').notNull().default(''),
    status: text('status').$type<'sent' | 'failed' | 'not_configured'>().notNull(),
    error: text('error').notNull().default(''),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('email_log_created_idx').on(t.createdAt)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: ts('reset_at').notNull(),
});
