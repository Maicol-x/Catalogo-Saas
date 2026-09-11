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
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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
  // Public directory of stores (for multi-tenant showcase/switching)
  // -------------------------------------------------------------
  app.get('/api/public/all-stores', async (_req, res) => {
    try {
      const { db } = await import('./src/db/index.ts');
      const { stores } = await import('./src/db/schema.ts');
      const all = await db.select().from(stores);
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
      const store = await createStore(req.user!.uid, req.body);
      res.status(201).json(store);
    } catch (error: any) {
      console.error('Create store error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Update store (Branding, Colors, WhatsApp, Subdomain)
  app.patch('/api/stores/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.id);
      const updated = await updateStore(storeId, req.user!.uid, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Update store error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Store Products CRUD
  // -------------------------------------------------------------
  app.get('/api/stores/:storeId/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado para esta tienda' });
      }

      const products = await getStoreProducts(storeId, { onlyActive: false });
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/products', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { name, price, summary, description, isActive, images, featureValueIds } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({ error: 'El nombre y el precio son obligatorios' });
      }

      const newProduct = await createProduct(storeId, {
        name,
        price,
        summary,
        description,
        isActive: isActive !== undefined ? isActive : true,
        images: Array.isArray(images) ? images : [],
        featureValueIds: Array.isArray(featureValueIds) ? featureValueIds : [],
      });

      res.status(201).json(newProduct);
    } catch (error: any) {
      console.error('Create product error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/stores/:storeId/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const productId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const updated = await updateProduct(productId, storeId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Update product error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/stores/:storeId/products/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const productId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await deleteProduct(productId, storeId);
      res.json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/stores/:storeId/products/:id/toggle-active', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const productId = Number(req.params.id);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
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
  app.get('/api/stores/:storeId/features', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const features = await getStoreFeaturesWithValues(storeId);
      res.json(features);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/features', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
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

  app.delete('/api/stores/:storeId/features/:featureId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const featureId = Number(req.params.featureId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      await deleteFeature(featureId, storeId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/stores/:storeId/features/:featureId/values', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const featureId = Number(req.params.featureId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const { value } = req.body;
      if (!value) return res.status(400).json({ error: 'Valor obligatorio' });

      const newVal = await addFeatureValue(featureId, value);
      res.status(201).json(newVal);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/stores/:storeId/features/values/:valueId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const valueId = Number(req.params.valueId);
      await deleteFeatureValue(valueId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Store Reviews Moderation
  // -------------------------------------------------------------
  app.get('/api/stores/:storeId/reviews', requireAuth, async (req: AuthRequest, res) => {
    try {
      const storeId = Number(req.params.storeId);
      const store = await getStoreById(storeId);
      if (!store || store.userUid !== req.user!.uid) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const reviewsList = await getStoreReviews(storeId);
      res.json(reviewsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/stores/:storeId/reviews/:reviewId/moderate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const reviewId = Number(req.params.reviewId);
      const { isApproved } = req.body;
      const updated = await moderateReview(reviewId, Boolean(isApproved));
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
