export interface User {
  id: number;
  uid: string;
  email: string;
  name?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  createdAt: string;
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
