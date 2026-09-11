import { SubscriptionPlan } from '../types.ts';

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  priceMonthly: number; // in USD
  priceYearly: number; // in USD (discounted)
  priceAnnual: number;
  maxProducts: number;
  maxImagesPerProduct: number;
  subdomainIncluded: boolean;
  qrCodeIncluded: boolean;
  customDomainEnabled: boolean;
  advancedBranding: boolean;
  reviewsModeration: boolean;
  advancedAnalytics: boolean;
  multiUserEnabled: boolean;
  badgeRemoval: boolean;
  prioritySupport: boolean;
  featuresList: string[];
  features: string[];
}

export const PLANS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    tagline: 'Ideal para comenzar y validar tu catálogo online',
    description: 'Ideal para comenzar y validar tu catálogo online',
    priceMonthly: 0,
    priceYearly: 0,
    priceAnnual: 0,
    maxProducts: 10,
    maxImagesPerProduct: 1,
    subdomainIncluded: true,
    qrCodeIncluded: true,
    customDomainEnabled: false,
    advancedBranding: false,
    reviewsModeration: true,
    advancedAnalytics: false,
    multiUserEnabled: false,
    badgeRemoval: false,
    prioritySupport: false,
    featuresList: [
      'Hasta 10 productos en catálogo',
      '1 foto por producto',
      'Subdominio gratuito (tunegocio.catalogo.app)',
      'Código QR de alta resolución descargable',
      'Botón de pedido directo a WhatsApp',
      'Filtrado dinámico por características y búsqueda',
      'Recepción y moderación de reseñas',
    ],
    features: [
      'Hasta 10 productos en catálogo',
      '1 foto por producto',
      'Subdominio gratuito (tunegocio.catalogo.app)',
      'Código QR de alta resolución descargable',
      'Botón de pedido directo a WhatsApp',
      'Filtrado dinámico por características y búsqueda',
      'Recepción y moderación de reseñas',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Profesional (Pro)',
    tagline: 'Para negocios en crecimiento que buscan destacar su marca',
    description: 'Para negocios en crecimiento que buscan destacar su marca',
    badge: 'Más Popular',
    priceMonthly: 12,
    priceYearly: 120, // 2 months free equivalent
    priceAnnual: 120,
    maxProducts: 500,
    maxImagesPerProduct: 8,
    subdomainIncluded: true,
    qrCodeIncluded: true,
    customDomainEnabled: true,
    advancedBranding: true,
    reviewsModeration: true,
    advancedAnalytics: true,
    multiUserEnabled: false,
    badgeRemoval: true,
    prioritySupport: true,
    featuresList: [
      'Productos ilimitados (hasta 500)',
      'Hasta 8 imágenes en alta calidad por producto',
      'Uso de Dominio Propio (ej: mitienda.com)',
      'Personalización estética avanzada (paletas y fuentes)',
      'Remoción de marca de agua',
      'Métricas de visitas y clics de pedido a WhatsApp',
      'Soporte prioritario por WhatsApp y email',
    ],
    features: [
      'Productos ilimitados (hasta 500)',
      'Hasta 8 imágenes en alta calidad por producto',
      'Uso de Dominio Propio (ej: mitienda.com)',
      'Personalización estética avanzada (paletas y fuentes)',
      'Remoción de marca de agua',
      'Métricas de visitas y clics de pedido a WhatsApp',
      'Soporte prioritario por WhatsApp y email',
    ],
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'Para marcas consolidadas, franquicias y equipos comerciales',
    description: 'Para marcas consolidadas, franquicias y equipos comerciales',
    badge: 'Empresarial',
    priceMonthly: 39,
    priceYearly: 390,
    priceAnnual: 390,
    maxProducts: 5000,
    maxImagesPerProduct: 20,
    subdomainIncluded: true,
    qrCodeIncluded: true,
    customDomainEnabled: true,
    advancedBranding: true,
    reviewsModeration: true,
    advancedAnalytics: true,
    multiUserEnabled: true,
    badgeRemoval: true,
    prioritySupport: true,
    featuresList: [
      'Catálogo masivo sin límites (hasta 5,000 productos)',
      'Galería completa de hasta 20 imágenes por producto',
      'Multiusuario / roles de equipo para gestión de inventario',
      'Dominio personalizado con certificado SSL gestionado',
      'Analíticas detalladas de conversión y productos más vistos',
      'Acceso anticipado a API y webhooks para sincronización ERP',
      'Gerente de cuenta y soporte 24/7',
    ],
    features: [
      'Catálogo masivo sin límites (hasta 5,000 productos)',
      'Galería completa de hasta 20 imágenes por producto',
      'Multiusuario / roles de equipo para gestión de inventario',
      'Dominio personalizado con certificado SSL gestionado',
      'Analíticas detalladas de conversión y productos más vistos',
      'Acceso anticipado a API y webhooks para sincronización ERP',
      'Gerente de cuenta y soporte 24/7',
    ],
  },
};

export const PLAN_CONFIGS = PLANS;

/**
 * Returns the plan configuration for a given plan ID
 */
export function getPlanConfig(plan: SubscriptionPlan = 'free'): PlanConfig {
  return PLANS[plan] || PLANS.free;
}

/**
 * Checks if a store can add another product given its plan and current count
 */
export function canStoreAddProduct(plan: SubscriptionPlan = 'free', currentProductCount: number): boolean {
  const config = getPlanConfig(plan);
  return currentProductCount < config.maxProducts;
}

/**
 * Checks if a store can add another image to a product given its plan and current image count
 */
export function canProductAddImage(plan: SubscriptionPlan = 'free', currentImageCount: number): boolean {
  const config = getPlanConfig(plan);
  return currentImageCount < config.maxImagesPerProduct;
}

/**
 * Checks if custom domain can be configured
 */
export function canStoreUseCustomDomain(plan: SubscriptionPlan = 'free'): boolean {
  const config = getPlanConfig(plan);
  return config.customDomainEnabled;
}
