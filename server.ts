import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserByUid, updateUserProfile } from './src/db/users.ts';
import {
  createStore,
  getStoreById,
  getStoreBySubdomain,
  getStoreByCustomDomain,
  getUserStores,
  isSubdomainAvailable,
  updateStore,
} from './src/db/stores.ts';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getSimilarProducts,
  getStoreProducts,
  toggleProductActive,
  updateProduct,
} from './src/db/products.ts';
import {
  addFeatureValue,
  createFeature,
  deleteFeature,
  deleteFeatureValue,
  getStoreFeaturesWithValues,
} from './src/db/features.ts';
import {
  createReview,
  getProductReviews,
  getStoreReviews,
  moderateReview,
} from './src/db/reviews.ts';
import { seedInitialDataIfNeeded } from './src/db/seed.ts';
import {
  getOrCreateStoreSubscription,
  getStoreUsageMetrics,
  initiateCheckoutSession,
  processPaymentWebhook,
  cancelStoreSubscription,
  updateStorePlanManually,
} from './src/services/subscriptionService.ts';
import { getStorageProvider } from './src/services/storage/index.ts';
import { SubscriptionPlan, BillingCycle, PaymentGateway } from './src/types.ts';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveTenant(req: express.Request): Promise<{ type: 'subdomain' | 'custom_domain'; identifier: string; store: any } | null> {
  // 1. Query parameter: ?subdomain=... or ?store=...
  if (req.query.subdomain && typeof req.query.subdomain === 'string') {
    const sub = req.query.subdomain.trim().toLowerCase();
    const store = await getStoreBySubdomain(sub);
    return store ? { type: 'subdomain', identifier: sub, store } : null;
  }
  if (req.query.store && typeof req.query.store === 'string') {
    const sub = req.query.store.trim().toLowerCase();
    const store = await getStoreBySubdomain(sub);
    return store ? { type: 'subdomain', identifier: sub, store } : null;
  }

  // 2. Explicit path prefix: /s/:subdomain
  const pathMatch = req.path.match(/^\/s\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) {
    const sub = pathMatch[1].toLowerCase();
    const store = await getStoreBySubdomain(sub);
    return store ? { type: 'subdomain', identifier: sub, store } : null;
  }

  // 3. Real host header detection (e.g. tunegocio.catalogo.app or tunegocio.com)
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
  const hostname = host.split(':')[0].toLowerCase();

  const ignoredDomains = [
    'localhost',
    '127.0.0.1',
    'run.app',
    'web.app',
    'firebaseapp.com',
    'github.dev',
    'applet.run',
  ];
  const isIgnored = ignoredDomains.some((d) => hostname.includes(d));

  if (!isIgnored) {
    // Check if hostname matches any store's custom domain
    const storeByCustomDomain = await getStoreByCustomDomain(hostname);
    if (storeByCustomDomain) {
      return { type: 'custom_domain', identifier: hostname, store: storeByCustomDomain };
    }

    // Configurable base domain
    const configuredBase = process.env.APP_DOMAIN || 'catalogo.app';
    if (hostname.endsWith(configuredBase)) {
      const prefix = hostname.replace(`.${configuredBase}`, '');
      if (prefix && prefix !== 'www' && prefix !== 'api' && prefix !== 'app') {
        const store = await getStoreBySubdomain(prefix);
        if (store) return { type: 'subdomain', identifier: prefix, store };
      }
    } else {
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api' && parts[0] !== 'app') {
        const store = await getStoreBySubdomain(parts[0]);
        if (store) return { type: 'subdomain', identifier: parts[0], store };
      }
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Static uploads directory serving
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      maxAge: '30d',
      immutable: true,
    })
  );

  // Seed default data if needed
  try {
    await seedInitialDataIfNeeded();
  } catch (err) {
    console.error('Seed check failed:', err);
  }

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // Resolve Tenant / Subdomain Endpoint
  // Resolves whether this request is for a specific merchant catalog
  // -------------------------------------------------------------
  app.get('/api/resolve-tenant', async (req, res) => {
    try {
      const tenant = await resolveTenant(req);
      if (!tenant) {
        return res.json({ isSubdomainRoute: false, store: null });
      }
      res.json({
        isSubdomainRoute: true,
        subdomain: tenant.store.subdomain,
        identifier: tenant.identifier,
        type: tenant.type,
        store: tenant.store,
      });
    } catch (error: any) {
      console.error('Failed to resolve tenant:', error);
      res.status(500).json({ error: error.message || 'Error resolviendo subdominio' });
    }
  });

  // -------------------------------------------------------------
  // Public directory of stores (for multi-tenant showcase/switching)
  // -------------------------------------------------------------
  app.get('/api/public/all-stores', async (_req, res) => {
    try {
      const { db } = await import('./src/db/index.ts');
      const { stores } = await import('./src/db/schema.ts');
      const all = await db
        .select({
          id: stores.id,
          name: stores.name,
          subdomain: stores.subdomain,
          welcomeMessage: stores.welcomeMessage,
          countryCode: stores.countryCode,
          phoneNumber: stores.phoneNumber,
          logoUrl: stores.logoUrl,
          coverUrl: stores.coverUrl,
          primaryColor: stores.primaryColor,
          secondaryColor: stores.secondaryColor,
          backgroundColor: stores.backgroundColor,
          font: stores.font,
          currency: stores.currency,
          createdAt: stores.createdAt,
        })
        .from(stores);
      res.json(all);
    } catch (error: any) {
      console.error('Failed to list stores:', error);
      res.status(500).json({ error: error.message || 'Failed to list stores' });
    }
  });

  // Check subdomain availability
  app.get('/api/stores/check-subdomain', async (req, res) => {
    try {
      const subdomain = String(req.query.subdomain || '');
      const exclude = req.query.excludeStoreId ? Number(req.query.excludeStoreId) : undefined;
      const available = await isSubdomainAvailable(subdomain, exclude);
      res.json({ subdomain, available });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Public Store Catalog (Multi-tenant by subdomain)
  // -------------------------------------------------------------
  app.get('/api/catalog/:subdomain', async (req, res) => {
    try {
      const store = await getStoreBySubdomain(req.params.subdomain);
      if (!store) {
        return res.status(404).json({ error: 'Catálogo no encontrado para este subdominio' });
      }

      const featuresWithValues = await getStoreFeaturesWithValues(store.id);

      // Extract search & filter params
      const search = req.query.search ? String(req.query.search) : undefined;
      let featureValueIds: number[] | undefined = undefined;
      if (req.query.features) {
        try {
          const parsed = JSON.parse(String(req.query.features));
          if (Array.isArray(parsed)) featureValueIds = parsed.map(Number);
        } catch {
          // ignore
        }
      }

      const products = await getStoreProducts(store.id, {
        onlyActive: true,
        search,
        featureValueIds,
      });

      res.json({
        store,
        features: featuresWithValues,
        products,
      });
    } catch (error: any) {
      console.error('Error fetching catalog:', error);
      res.status(500).json({ error: error.message || 'Error al obtener catálogo' });
    }
  });

  // Public single product detail
  app.get('/api/catalog/:subdomain/products/:productId', async (req, res) => {
    try {
      const store = await getStoreBySubdomain(req.params.subdomain);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }

      const product = await getProductById(Number(req.params.productId));
      if (!product || product.storeId !== store.id) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const similar = await getSimilarProducts(product.id, store.id, 4);

      res.json({
        product,
        similar,
        store,
      });
    } catch (error: any) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: error.message || 'Error al obtener producto' });
    }
  });

  // Public review creation
  app.post('/api/catalog/:subdomain/products/:productId/reviews', async (req, res) => {
    try {
      const { authorName, rating, comment } = req.body;
      if (!authorName || !comment || !rating) {
        return res.status(400).json({ error: 'Nombre, puntuación y comentario son obligatorios' });
      }

      const review = await createReview(Number(req.params.productId), {
        authorName,
        rating: Number(rating),
        comment,
      });

      res.status(201).json(review);
    } catch (error: any) {
      console.error('Error creating review:', error);
      res.status(500).json({ error: error.message || 'Error al crear reseña' });
    }
  });

  // Server QR Code generation helper
  app.get('/api/qr', async (req, res) => {
    try {
      const targetUrl = String(req.query.url || '');
      if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
      }
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      res.json({ qrDataUrl: dataUrl, url: targetUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pluggable image upload handler (Local Disk / S3 / R2 / Supabase)
  app.post('/api/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawData = req.body.imageBase64 || req.body.fileData;
      if (!rawData || typeof rawData !== 'string') {
        return res.status(400).json({ error: 'Datos de imagen requeridos' });
      }
      if (rawData.length > 7 * 1024 * 1024) {
        return res.status(400).json({ error: 'La imagen supera el límite de 5MB' });
      }

      let mimeType = 'image/jpeg';
      let buffer: Buffer;

      const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(rawData, 'base64');
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: 'Formato de imagen no soportado. Usa JPG, PNG, WebP o GIF.' });
      }

      const storage = getStorageProvider();
      const uploaded = await storage.upload(buffer, mimeType, req.body.fileName || 'product.webp');
      res.json({ url: uploaded.url, key: uploaded.key, size: uploaded.size });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Error procesando imagen' });
    }
  });

  // -------------------------------------------------------------
  // Authenticated Merchant Routes
  // -------------------------------------------------------------

  // User Auth Sync
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const token = req.user!;
      const user = await getOrCreateUser(token.uid, token.email || '', token.name);
      const userStores = await getUserStores(token.uid);
      res.json({ user, stores: userStores });
    } catch (error: any) {
      console.error('Auth sync error:', error);
      res.status(500).json({ error: error.message || 'Error sincronizando usuario' });
    }
  });

  // Update merchant profile (phone number for WhatsApp)
  app.patch('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const token = req.user!;
      const { phoneNumber, countryCode, name } = req.body;
      const updated = await updateUserProfile(token.uid, { phoneNumber, countryCode, name });
      res.json(updated);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: error.message || 'Error actualizando perfil' });
    }
  });

  // Merchant Stores
  app.get('/api/stores/mine', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storesList = await getUserStores(req.user!.uid);
      res.json(storesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create store
  app.post('/api/stores', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { phoneNumber } = req.body;
      const cleanDigits = (phoneNumber || '').replace(/[\s\-\(\)\+]/g, '');
      if (!phoneNumber || cleanDigits.length < 7) {
        return res.status(400).json({
          error: 'El número de WhatsApp es obligatorio y debe tener al menos 7 dígitos válidos.',
        });
      }

      const store = await createStore(req.user!.uid, req.body);
      res.status(201).json(store);
    } catch (error: any) {
      console.error('Create store error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Helper to check if a user is allowed to manage a store (demo store is accessible in sandbox mode)
  function canManageStore(store: any, user?: any): boolean {
    if (!store) return false;
    if (store.userUid === 'demo_merchant_uid_1') return true;
    if (user && store.userUid === user.uid) return true;
    return false;
  }

  // Update store (Branding, Colors, WhatsApp, Subdomain, Custom Domain)
  app.patch('/api/stores/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
      if (!canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      if (req.body.phoneNumber !== undefined) {
        const cleanDigits = (req.body.phoneNumber || '').replace(/[\s\-\(\)\+]/g, '');
        if (!req.body.phoneNumber || cleanDigits.length < 7) {
          return res.status(400).json({
            error: 'El número de WhatsApp es obligatorio y debe tener al menos 7 dígitos válidos.',
          });
        }
      }

      // Monetization: verify custom domain is allowed in store plan
      if (req.body.customDomain) {
        const metrics = await getStoreUsageMetrics(storeId);
        if (!metrics.customDomainEnabled) {
          return res.status(403).json({
            error: 'El uso de dominio personalizado requiere el Plan Profesional o Business. Actualiza tu plan en la pestaña de Suscripción.',
            code: 'FEATURE_REQUIRES_UPGRADE',
          });
        }
      }

      const actingUserUid = req.user?.uid || store.userUid;
      const updated = await updateStore(storeId, actingUserUid, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Update store error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Subscription & Billing Routes
  // -------------------------------------------------------------
  app.get('/api/stores/:storeId/subscription', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
      if (!canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const subscription = await getOrCreateStoreSubscription(storeId, store.userId);
      const usage = await getStoreUsageMetrics(storeId);

      res.json({
        subscription,
        usage,
      });
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: error.message || 'Error al obtener suscripción' });
    }
  });

  app.post('/api/stores/:storeId/subscription/checkout', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
      if (!canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { plan, billingCycle, gateway } = req.body;
      if (!plan || !['pro', 'business'].includes(plan)) {
        return res.status(400).json({ error: 'Plan no válido para suscripción' });
      }

      const selectedGateway = (gateway || 'stripe') as PaymentGateway;
      const cycle = (billingCycle || 'monthly') as BillingCycle;
      const origin = req.headers.origin || process.env.APP_URL || 'https://catalogo.app';

      const checkout = await initiateCheckoutSession({
        storeId,
        userId: store.userId,
        userEmail: req.user?.email || 'contacto@catalogo.app',
        plan,
        billingCycle: cycle,
        gateway: selectedGateway,
        successUrl: `${origin}/dashboard?tab=subscription&checkout=success`,
        cancelUrl: `${origin}/dashboard?tab=subscription&checkout=canceled`,
      });

      res.json(checkout);
    } catch (error: any) {
      console.error('Checkout creation error:', error);
      res.status(500).json({ error: error.message || 'Error al iniciar checkout' });
    }
  });

  app.post('/api/stores/:storeId/subscription/plan', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
      if (!canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { plan } = req.body;
      if (!['free', 'pro', 'business'].includes(plan)) {
        return res.status(400).json({ error: 'Plan inválido' });
      }

      const updated = await updateStorePlanManually(storeId, store.userId, plan);
      const usage = await getStoreUsageMetrics(storeId);
      res.json({ subscription: updated, usage });
    } catch (error: any) {
      console.error('Plan update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/subscription/cancel', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
      if (!canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await cancelStoreSubscription(storeId);
      const updated = await getOrCreateStoreSubscription(storeId, store.userId);
      res.json({ success: true, subscription: updated });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Webhooks for Stripe, MercadoPago, Paddle
  app.post('/api/webhooks/:gateway', async (req, res) => {
    try {
      const gateway = req.params.gateway as PaymentGateway;
      if (!['stripe', 'mercadopago', 'paddle'].includes(gateway)) {
        return res.status(400).json({ error: 'Gateway desconocido' });
      }

      const rawSig = req.headers['stripe-signature'] as string | undefined;
      const result = await processPaymentWebhook(gateway, req.body, rawSig);
      res.json(result);
    } catch (error: any) {
      console.error(`Webhook processing error for ${req.params.gateway}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Store Products CRUD
  // -------------------------------------------------------------
  app.get('/api/stores/:storeId/products', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado para esta tienda' });
      }

      const products = await getStoreProducts(storeId, { onlyActive: false });
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/products', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Monetization: enforce product count quota
      const metrics = await getStoreUsageMetrics(storeId);
      if (!metrics.canAddProduct) {
        return res.status(403).json({
          error: `Has alcanzado el límite máximo de ${metrics.maxProducts} productos de tu plan actual (${metrics.plan.toUpperCase()}). Actualiza tu plan para continuar agregando artículos.`,
          code: 'PLAN_PRODUCT_LIMIT_REACHED',
        });
      }

      const { name, price, summary, description, isActive, featureValueIds } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({ error: 'El nombre y el precio son obligatorios' });
      }

      // Monetization: enforce maximum images allowed per product
      let images = Array.isArray(req.body.images) ? req.body.images : [];
      if (images.length > metrics.maxImagesPerProduct) {
        images = images.slice(0, metrics.maxImagesPerProduct);
      }

      const newProduct = await createProduct(storeId, {
        name,
        price,
        summary,
        description,
        isActive: isActive !== undefined ? isActive : true,
        images,
        featureValueIds: Array.isArray(featureValueIds) ? featureValueIds : [],
      });

      res.status(201).json(newProduct);
    } catch (error: any) {
      console.error('Create product error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/stores/:storeId/products/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const productId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const updated = await updateProduct(productId, storeId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Update product error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/stores/:storeId/products/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const productId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await deleteProduct(productId, storeId);
      res.json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/stores/:storeId/products/:id/toggle-active', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const productId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const updated = await toggleProductActive(productId, storeId);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Store Features & Dynamic Attributes
  // -------------------------------------------------------------
  app.get('/api/stores/:storeId/features', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const features = await getStoreFeaturesWithValues(storeId);
      res.json(features);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/features', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { name, values } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'El nombre de la característica es obligatorio' });
      }

      const created = await createFeature(storeId, name, values || []);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/stores/:storeId/features/:featureId', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const featureId = Number(req.params.featureId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await deleteFeature(featureId, storeId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/features/:featureId/values', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const featureId = Number(req.params.featureId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { value } = req.body;
      if (!value) return res.status(400).json({ error: 'Valor obligatorio' });

      // Validates that featureId belongs to storeId
      const newVal = await addFeatureValue(featureId, value, storeId);
      res.status(201).json(newVal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/stores/:storeId/features/values/:valueId', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const valueId = Number(req.params.valueId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Validates that valueId belongs to storeId
      await deleteFeatureValue(valueId, storeId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Store Reviews Moderation
  // -------------------------------------------------------------
  app.get('/api/stores/:storeId/reviews', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const reviewsList = await getStoreReviews(storeId);
      res.json(reviewsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/stores/:storeId/reviews/:reviewId/moderate', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const reviewId = Number(req.params.reviewId);
      const store = await getStoreById(storeId);
      if (!store || !canManageStore(store, req.user)) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { isApproved } = req.body;
      // Validates that review belongs to this store
      const updated = await moderateReview(reviewId, Boolean(isApproved), storeId);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Vite Middleware setup
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Catálogo SaaS server running on port ${PORT}`);
  });
}

startServer();
