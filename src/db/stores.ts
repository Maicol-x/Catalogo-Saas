import { eq, and, ne } from 'drizzle-orm';
import { db } from './index.ts';
import { stores, users } from './schema.ts';

export interface CreateStoreInput {
  name: string;
  subdomain: string;
  customDomain?: string;
  plan?: string;
  welcomeMessage?: string;
  phoneNumber?: string;
  countryCode?: string;
  logoUrl?: string;
  coverUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  font?: string;
  currency?: string;
}

export async function isSubdomainAvailable(subdomain: string, excludeStoreId?: number) {
  try {
    const cleanSubdomain = subdomain.toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
      return false;
    }
    const found = await db.select().from(stores).where(eq(stores.subdomain, cleanSubdomain));
    if (found.length === 0) return true;
    if (excludeStoreId && found.length === 1 && found[0].id === excludeStoreId) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('isSubdomainAvailable error:', error);
    throw new Error('Failed to check subdomain availability', { cause: error });
  }
}

export async function getStoreBySubdomain(subdomain: string) {
  try {
    const clean = subdomain.toLowerCase().trim();
    const res = await db.select().from(stores).where(eq(stores.subdomain, clean)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('getStoreBySubdomain error:', error);
    throw new Error('Failed to fetch store by subdomain', { cause: error });
  }
}

export async function getStoreByCustomDomain(domain: string) {
  try {
    const clean = domain.toLowerCase().trim();
    const res = await db.select().from(stores).where(eq(stores.customDomain, clean)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('getStoreByCustomDomain error:', error);
    throw new Error('Failed to fetch store by custom domain', { cause: error });
  }
}

export async function getStoreById(id: number) {
  try {
    const res = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('getStoreById error:', error);
    throw new Error('Failed to fetch store by id', { cause: error });
  }
}

export async function getUserStores(userUid: string) {
  try {
    return await db.select().from(stores).where(eq(stores.userUid, userUid));
  } catch (error) {
    console.error('getUserStores error:', error);
    throw new Error('Failed to fetch user stores', { cause: error });
  }
}

export async function createStore(userUid: string, input: CreateStoreInput) {
  try {
    const userRes = await db.select().from(users).where(eq(users.uid, userUid)).limit(1);
    if (!userRes[0]) {
      throw new Error('User not found');
    }

    const available = await isSubdomainAvailable(input.subdomain);
    if (!available) {
      throw new Error(`El subdominio '${input.subdomain}' ya está en uso.`);
    }

    const rawPhone = input.phoneNumber || userRes[0].phoneNumber || '';
    const phoneDigits = rawPhone.replace(/[\s\-\(\)\+]/g, '');
    if (!rawPhone.trim() || phoneDigits.length < 7) {
      throw new Error('El número de WhatsApp es obligatorio y debe contener al menos 7 dígitos válidos.');
    }

    const inserted = await db
      .insert(stores)
      .values({
        userId: userRes[0].id,
        userUid,
        subdomain: input.subdomain.toLowerCase().trim(),
        name: input.name,
        welcomeMessage: input.welcomeMessage || '¡Te damos la bienvenida a nuestro catálogo digital! Haz tus pedidos directamente por WhatsApp.',
        phoneNumber: rawPhone.trim(),
        countryCode: input.countryCode || userRes[0].countryCode || '+52',
        logoUrl: input.logoUrl || '',
        coverUrl: input.coverUrl || '',
        primaryColor: input.primaryColor || '#18181b',
        secondaryColor: input.secondaryColor || '#f4f4f5',
        backgroundColor: input.backgroundColor || '#fafafa',
        font: input.font || 'Plus Jakarta Sans',
        currency: input.currency || 'USD',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('createStore error:', error);
    throw new Error('Failed to create store: ' + (error as Error).message, { cause: error });
  }
}

export async function updateStore(storeId: number, userUid: string, input: Partial<CreateStoreInput>) {
  try {
    const current = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userUid, userUid)))
      .limit(1);

    if (!current[0]) {
      throw new Error('Store not found or unauthorized');
    }

    if (input.subdomain && input.subdomain !== current[0].subdomain) {
      const available = await isSubdomainAvailable(input.subdomain, storeId);
      if (!available) {
        throw new Error(`El subdominio '${input.subdomain}' ya está en uso.`);
      }
    }

    if (input.phoneNumber !== undefined) {
      const phoneDigits = input.phoneNumber.replace(/[\s\-\(\)\+]/g, '');
      if (!input.phoneNumber.trim() || phoneDigits.length < 7) {
        throw new Error('El número de WhatsApp es obligatorio y debe contener al menos 7 dígitos válidos.');
      }
    }

    if (input.customDomain !== undefined) {
      const cleanCustomDomain = input.customDomain ? input.customDomain.toLowerCase().trim() : null;
      if (cleanCustomDomain) {
        // Validate domain format (e.g., example.com, catalog.store.co)
        if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,10}$/.test(cleanCustomDomain)) {
          throw new Error('Formato de dominio personalizado no válido (ej: mitienda.com)');
        }
        // Verify not already registered by another store
        const existingDomain = await db
          .select()
          .from(stores)
          .where(and(eq(stores.customDomain, cleanCustomDomain), ne(stores.id, storeId)))
          .limit(1);
        if (existingDomain.length > 0) {
          throw new Error(`El dominio '${cleanCustomDomain}' ya está vinculado a otra tienda.`);
        }
      }
    }

    const updatePayload: any = {
      ...input,
      updatedAt: new Date(),
    };
    if (input.subdomain) {
      updatePayload.subdomain = input.subdomain.toLowerCase().trim();
    }
    if (input.customDomain !== undefined) {
      updatePayload.customDomain = input.customDomain ? input.customDomain.toLowerCase().trim() : null;
    }

    const updated = await db
      .update(stores)
      .set(updatePayload)
      .where(eq(stores.id, storeId))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('updateStore error:', error);
    throw new Error('Failed to update store: ' + (error as Error).message, { cause: error });
  }
}
