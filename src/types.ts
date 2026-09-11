export interface User {
  id: number;
  uid: string;
  email: string;
  name?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  createdAt: string;
}

export type SubscriptionPlan = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentGateway = 'stripe' | 'mercadopago' | 'paddle' | 'manual';

export interface StoreSubscription {
  id: number;
  storeId: number;
  userId: number;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  provider: PaymentGateway;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreUsageMetrics {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentProductCount: number;
  maxProducts: number;
  maxImagesPerProduct: number;
  customDomainEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  multiUserEnabled: boolean;
  canAddProduct: boolean;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Store {
  id: number;
  userId: number;
  userUid: string;
  subdomain: string;
  name: string;
  welcomeMessage?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  font: string;
  currency: string;
  customDomain?: string | null;
  plan?: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureValue {
  id: number;
  featureId: number;
  value: string;
  createdAt?: string;
  featureName?: string;
}

export interface Feature {
  id: number;
  storeId: number;
  name: string;
  createdAt?: string;
  values: FeatureValue[];
}

export interface ProductImage {
  id?: number;
  productId?: number;
  url: string;
  sortOrder: number;
}

export interface Review {
  id: number;
  productId: number;
  authorName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  productName?: string;
}

export interface Product {
  id: number;
  storeId: number;
  name: string;
  price: string;
  summary?: string | null;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  images: string[];
  imageRecords?: ProductImage[];
  featureValues: FeatureValue[];
  featureValueIds: number[];
  reviews?: Review[];
}

export interface CatalogData {
  store: Store;
  features: Feature[];
  products: Product[];
}
