import { relations } from 'drizzle-orm';
import { boolean, index, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID
  email: text('email').notNull(),
  name: text('name'),
  phoneNumber: text('phone_number'),
  countryCode: text('country_code').default('+52'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uidIdx: index('users_uid_idx').on(table.uid),
  emailIdx: index('users_email_idx').on(table.email),
}));

export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  userUid: text('user_uid').notNull(), // For fast query lookup
  subdomain: text('subdomain').notNull().unique(),
  customDomain: text('custom_domain').unique(),
  plan: text('plan').default('free').notNull(), // 'free' | 'pro' | 'business'
  name: text('name').notNull(),
  welcomeMessage: text('welcome_message'),
  phoneNumber: text('phone_number'),
  countryCode: text('country_code').default('+52'),
  logoUrl: text('logo_url'),
  coverUrl: text('cover_url'),
  primaryColor: text('primary_color').default('#18181b').notNull(),
  secondaryColor: text('secondary_color').default('#f4f4f5').notNull(),
  backgroundColor: text('background_color').default('#fafafa').notNull(),
  font: text('font').default('Plus Jakarta Sans').notNull(),
  currency: text('currency').default('USD').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('stores_user_id_idx').on(table.userId),
  userUidIdx: index('stores_user_uid_idx').on(table.userUid),
  subdomainIdx: index('stores_subdomain_idx').on(table.subdomain),
  customDomainIdx: index('stores_custom_domain_idx').on(table.customDomain),
}));

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  plan: text('plan').default('free').notNull(), // 'free' | 'pro' | 'business'
  status: text('status').default('active').notNull(), // 'active' | 'trialing' | 'past_due' | 'canceled'
  billingCycle: text('billing_cycle').default('monthly').notNull(), // 'monthly' | 'yearly'
  provider: text('provider').default('manual').notNull(), // 'stripe' | 'mercadopago' | 'paddle' | 'manual'
  providerSubscriptionId: text('provider_subscription_id'),
  providerCustomerId: text('provider_customer_id'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  storeIdIdx: index('subscriptions_store_id_idx').on(table.storeId),
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  providerSubIdx: index('subscriptions_provider_sub_idx').on(table.providerSubscriptionId),
}));

export const features = pgTable('features', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  storeIdIdx: index('features_store_id_idx').on(table.storeId),
}));

export const featureValues = pgTable('feature_values', {
  id: serial('id').primaryKey(),
  featureId: integer('feature_id').references(() => features.id, { onDelete: 'cascade' }).notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  featureIdIdx: index('feature_values_feature_id_idx').on(table.featureId),
}));

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  summary: text('summary'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  storeIdIdx: index('products_store_id_idx').on(table.storeId),
  isActiveIdx: index('products_is_active_idx').on(table.isActive),
  storeActiveIdx: index('products_store_active_idx').on(table.storeId, table.isActive),
}));

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => ({
  productIdIdx: index('product_images_product_id_idx').on(table.productId),
}));

export const productFeatures = pgTable('product_features', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  featureValueId: integer('feature_value_id').references(() => featureValues.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  productIdIdx: index('product_features_product_id_idx').on(table.productId),
  featureValueIdIdx: index('product_features_feature_value_id_idx').on(table.featureValueId),
}));

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  productIdIdx: index('reviews_product_id_idx').on(table.productId),
  productApprovedIdx: index('reviews_product_approved_idx').on(table.productId, table.isApproved),
}));

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
  subscriptions: many(subscriptions),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, {
    fields: [stores.userId],
    references: [users.id],
  }),
  products: many(products),
  features: many(features),
  subscription: one(subscriptions, {
    fields: [stores.id],
    references: [subscriptions.storeId],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  store: one(stores, {
    fields: [subscriptions.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const featuresRelations = relations(features, ({ one, many }) => ({
  store: one(stores, {
    fields: [features.storeId],
    references: [stores.id],
  }),
  values: many(featureValues),
}));

export const featureValuesRelations = relations(featureValues, ({ one, many }) => ({
  feature: one(features, {
    fields: [featureValues.featureId],
    references: [features.id],
  }),
  productFeatures: many(productFeatures),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  images: many(productImages),
  productFeatures: many(productFeatures),
  reviews: many(reviews),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productFeaturesRelations = relations(productFeatures, ({ one }) => ({
  product: one(products, {
    fields: [productFeatures.productId],
    references: [products.id],
  }),
  featureValue: one(featureValues, {
    fields: [productFeatures.featureValueId],
    references: [featureValues.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
