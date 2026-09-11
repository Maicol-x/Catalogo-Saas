import { eq, and, ne } from 'drizzle-orm';
import { db } from './index.ts';
import { stores, users } from './schema.ts';
import { isReservedSubdomain } from '../lib/reservedSubdomains.ts';

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
    if (!/^[a-z0-9-]+$/.test(cleanSubdomain) || cleanSubdomain.length < 2 || cleanSubdomain.length > 50) {
      return false;
    }
    // Prevent registration of reserved keywords (admin, api, auth, cdn, etc.)
    if (isReservedSubdomain(cleanSubdomain)) {
      return false;
    }
    const found = await db.select({ id: stores.id }).from(stores).where(eq(stores.subdomain, cleanSubdomain));
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

    const cleanSubdomain = (input.subdomain || '').toLowerCase().trim();
    if (isReservedSubdomain(cleanSubdomain)) {
      throw new Error(`El subdominio '${cleanSubdomain}' es un nombre reservado del sistema.`);
    }

    const available = await isSubdomainAvailable(cleanSubdomain);
    if (!available) {
      throw new Error(`El subdominio '${cleanSubdomain}' ya está en uso.`);
    }

    const rawPhone = input.phoneNumber || userRes[0].phoneNumber || '';
    const phoneDigits = rawPhone.replace(/[\s\-\(\)\+]/g, '');
    if (!rawPhone.trim() || phoneDigits.length < 7) {
      throw new Error('El número de WhatsApp es obligatorio y debe contener al menos 7 dígitos válidos.');
    }

    // Security: Only allow explicit fields; never accept plan, id or userId from user input
    const inserted = await db
      .insert(stores)
      .values({
        userId: userRes[0].id,
        userUid,
        subdomain: cleanSubdomain,
        plan: 'free', // Always starts as free; upgrades require verified checkout
        name: input.name.trim(),
        welcomeMessage: input.welcomeMessage?.trim() || '¡Te damos la bienvenida a nuestro catálogo digital! Haz tus pedidos directamente por WhatsApp.',
        phoneNumber: rawPhone.trim(),
        countryCode: input.countryCode?.trim() || userRes[0].countryCode || '+52',
        logoUrl: input.logoUrl?.trim() || '',
        coverUrl: input.coverUrl?.trim() || '',
        primaryColor: input.primaryColor?.trim() || '#18181b',
        secondaryColor: input.secondaryColor?.trim() || '#f4f4f5',
        backgroundColor: input.backgroundColor?.trim() || '#fafafa',
        font: input.font?.trim() || 'Plus Jakarta Sans',
        currency: input.currency?.trim() || 'USD',
      })
      .returning();

    return inserted[0];
  } catch (error: any) {
    console.error('createStore error:', error);
    // Database level unique constraint race condition protection
    if (error?.code === '23505' || String(error?.message || '').includes('unique constraint') || String(error?.message || '').includes('subdomain')) {
      throw new Error(`El subdominio '${input.subdomain}' ya está registrado por otro catálogo.`);
    }
    throw new Error('Failed to create store: ' + (error as Error).message, { cause: error });
  }
}

export async function updateStore(storeId: number, userUid: string, input: Partial<CreateStoreInput>) {
  try {
    // 1. Strict Tenant Isolation: Ensure store exists and belongs to the authenticated userUid
    const current = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.userUid, userUid)))
      .limit(1);

    if (!current[0]) {
      throw new Error('Store not found or unauthorized');
    }

    // 2. Validate subdomain changes
    let newSubdomain: string | undefined = undefined;
    if (input.subdomain && input.subdomain.toLowerCase().trim() !== current[0].subdomain) {
      const cleanSub = input.subdomain.toLowerCase().trim();
      if (isReservedSubdomain(cleanSub)) {
        throw new Error(`El subdominio '${cleanSub}' es un nombre reservado del sistema.`);
      }
      const available = await isSubdomainAvailable(cleanSub, storeId);
      if (!available) {
        throw new Error(`El subdominio '${cleanSub}' ya está en uso.`);
      }
      newSubdomain = cleanSub;
    }

    // 3. Validate phone number if provided
    let newPhone: string | undefined = undefined;
    if (input.phoneNumber !== undefined) {
      const phoneDigits = input.phoneNumber.replace(/[\s\-\(\)\+]/g, '');
      if (!input.phoneNumber.trim() || phoneDigits.length < 7) {
        throw new Error('El número de WhatsApp es obligatorio y debe contener al menos 7 dígitos válidos.');
      }
      newPhone = input.phoneNumber.trim();
    }

    // 4. Validate custom domain if provided
    let newCustomDomain: string | null | undefined = undefined;
    if (input.customDomain !== undefined) {
      const cleanCustomDomain = input.customDomain ? input.customDomain.toLowerCase().trim() : null;
      if (cleanCustomDomain) {
        // Validate domain format (e.g., example.com, catalog.store.co)
        if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,10}$/.test(cleanCustomDomain)) {
          throw new Error('Formato de dominio personalizado no válido (ej: mitienda.com)');
        }
        // Verify not already registered by another store
        const existingDomain = await db
          .select({ id: stores.id })
          .from(stores)
          .where(and(eq(stores.customDomain, cleanCustomDomain), ne(stores.id, storeId)))
          .limit(1);
        if (existingDomain.length > 0) {
          throw new Error(`El dominio '${cleanCustomDomain}' ya está vinculado a otra tienda.`);
        }
      }
      newCustomDomain = cleanCustomDomain;
    }

    // 5. Anti-Mass-Assignment Whitelist:
    // Strictly pick only mutable configuration fields.
    // Client CANNOT overwrite id, userId, userUid, plan, createdAt, etc.
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.welcomeMessage !== undefined) updatePayload.welcomeMessage = input.welcomeMessage.trim();
    if (newPhone !== undefined) updatePayload.phoneNumber = newPhone;
    if (input.countryCode !== undefined) updatePayload.countryCode = input.countryCode.trim();
    if (input.logoUrl !== undefined) updatePayload.logoUrl = input.logoUrl.trim();
    if (input.coverUrl !== undefined) updatePayload.coverUrl = input.coverUrl.trim();
    if (input.primaryColor !== undefined) updatePayload.primaryColor = input.primaryColor.trim();
    if (input.secondaryColor !== undefined) updatePayload.secondaryColor = input.secondaryColor.trim();
    if (input.backgroundColor !== undefined) updatePayload.backgroundColor = input.backgroundColor.trim();
    if (input.font !== undefined) updatePayload.font = input.font.trim();
    if (input.currency !== undefined) updatePayload.currency = input.currency.trim();
    if (newSubdomain !== undefined) updatePayload.subdomain = newSubdomain;
    if (newCustomDomain !== undefined) updatePayload.customDomain = newCustomDomain;

    const updated = await db
      .update(stores)
      .set(updatePayload)
      .where(and(eq(stores.id, storeId), eq(stores.userUid, userUid)))
      .returning();

    return updated[0];
  } catch (error: any) {
    console.error('updateStore error:', error);
    if (error?.code === '23505' || String(error?.message || '').includes('unique constraint') || String(error?.message || '').includes('subdomain')) {
      throw new Error(`El subdominio '${input.subdomain}' ya está registrado por otro catálogo.`);
    }
    throw new Error('Failed to update store: ' + (error as Error).message, { cause: error });
  }
}
