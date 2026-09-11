import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { products, productImages, productFeatures, featureValues, features, reviews } from './schema.ts';

export interface CreateProductInput {
  name: string;
  price: string | number;
  summary?: string;
  description?: string;
  isActive?: boolean;
  images: string[];
  featureValueIds: number[];
}

export async function getStoreProducts(
  storeId: number,
  options?: {
    onlyActive?: boolean;
    search?: string;
    featureValueIds?: number[];
  }
) {
  try {
    const conditions = [eq(products.storeId, storeId)];
    if (options?.onlyActive) {
      conditions.push(eq(products.isActive, true));
    }

    let allStoreProducts = await db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(products.sortOrder, desc(products.createdAt));

    if (options?.search && options.search.trim()) {
      const s = options.search.toLowerCase().trim();
      allStoreProducts = allStoreProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.summary && p.summary.toLowerCase().includes(s)) ||
          (p.description && p.description.toLowerCase().includes(s))
      );
    }

    if (allStoreProducts.length === 0) return [];

    const productIds = allStoreProducts.map((p) => p.id);

    // Fetch images ONLY for products in this store
    const relevantImages = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.sortOrder);

    // Fetch assigned feature values ONLY for products in this store
    const relevantPFeatures = await db
      .select()
      .from(productFeatures)
      .where(inArray(productFeatures.productId, productIds));

    const fvIds = Array.from(new Set(relevantPFeatures.map((pf) => pf.featureValueId)));
    let fvMap = new Map<number, { id: number; featureId: number; value: string; featureName?: string }>();

    if (fvIds.length > 0) {
      const allFvs = await db
        .select()
        .from(featureValues)
        .where(inArray(featureValues.id, fvIds));

      const allFeats = await db.select().from(features).where(eq(features.storeId, storeId));
      const featMap = new Map(allFeats.map((f) => [f.id, f.name]));

      for (const fv of allFvs) {
        fvMap.set(fv.id, {
          ...fv,
          featureName: featMap.get(fv.featureId),
        });
      }
    }

    let result = allStoreProducts.map((prod) => {
      const prodImgs = relevantImages
        .filter((img) => img.productId === prod.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const prodPFeats = relevantPFeatures.filter((pf) => pf.productId === prod.id);
      const assignedValues = prodPFeats
        .map((pf) => fvMap.get(pf.featureValueId))
        .filter(Boolean) as { id: number; featureId: number; value: string; featureName?: string }[];

      return {
        ...prod,
        images: prodImgs.map((img) => img.url),
        imageRecords: prodImgs,
        featureValues: assignedValues,
        featureValueIds: assignedValues.map((v) => v.id),
      };
    });

    // Dynamic attribute filtering: If featureValueIds are passed, product must match
    if (options?.featureValueIds && options.featureValueIds.length > 0) {
      const requiredIds = options.featureValueIds;
      result = result.filter((prod) =>
        requiredIds.every((reqId) => prod.featureValueIds.includes(reqId))
      );
    }

    return result;
  } catch (error) {
    console.error('getStoreProducts error:', error);
    throw new Error('Failed to fetch store products', { cause: error });
  }
}

export async function getProductById(id: number) {
  try {
    const prodRes = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!prodRes[0]) return null;
    const prod = prodRes[0];

    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(productImages.sortOrder);

    const pFeatures = await db
      .select()
      .from(productFeatures)
      .where(eq(productFeatures.productId, id));

    const fvIds = Array.from(new Set(pFeatures.map((pf) => pf.featureValueId)));
    let assignedValues: { id: number; featureId: number; value: string; featureName?: string }[] = [];

    if (fvIds.length > 0) {
      const allFvs = await db
        .select()
        .from(featureValues)
        .where(inArray(featureValues.id, fvIds));
      const allFeats = await db.select().from(features).where(eq(features.storeId, prod.storeId));
      const featMap = new Map(allFeats.map((f) => [f.id, f.name]));

      for (const fv of allFvs) {
        assignedValues.push({
          ...fv,
          featureName: featMap.get(fv.featureId),
        });
      }
    }

    const prodReviews = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, id), eq(reviews.isApproved, true)))
      .orderBy(desc(reviews.createdAt));

    return {
      ...prod,
      images: images.map((i) => i.url),
      imageRecords: images,
      featureValues: assignedValues,
      featureValueIds: assignedValues.map((v) => v.id),
      reviews: prodReviews,
    };
  } catch (error) {
    console.error('getProductById error:', error);
    throw new Error('Failed to fetch product by id', { cause: error });
  }
}

/**
 * Helper to strictly validate that all supplied feature value IDs belong to features owned by the given storeId.
 * Prevents cross-tenant feature injection attacks (BOLA / IDOR).
 */
async function validateFeatureValuesBelongToStore(
  client: typeof db,
  featureValueIds: number[],
  storeId: number
): Promise<number[]> {
  if (!featureValueIds || featureValueIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(featureValueIds.map(Number).filter((n) => !isNaN(n) && n > 0)));
  if (uniqueIds.length === 0) return [];

  const validFvs = await client
    .select({ id: featureValues.id })
    .from(featureValues)
    .innerJoin(features, eq(featureValues.featureId, features.id))
    .where(
      and(
        inArray(featureValues.id, uniqueIds),
        eq(features.storeId, storeId)
      )
    );

  if (validFvs.length !== uniqueIds.length) {
    throw new Error('Uno o más atributos seleccionados no pertenecen a este catálogo.');
  }

  return uniqueIds;
}

export async function createProduct(storeId: number, input: CreateProductInput) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Cross-tenant validation: verify all featureValueIds belong to this store
      const validatedFvIds = await validateFeatureValuesBelongToStore(
        tx as any,
        input.featureValueIds || [],
        storeId
      );

      // 2. Insert product under this specific storeId
      const insertedProd = await tx
        .insert(products)
        .values({
          storeId,
          name: input.name.trim(),
          price: String(input.price),
          summary: input.summary?.trim() || '',
          description: input.description?.trim() || '',
          isActive: input.isActive !== undefined ? input.isActive : true,
        })
        .returning();

      const created = insertedProd[0];

      // 3. Insert images transactionally
      if (input.images && input.images.length > 0) {
        for (let i = 0; i < input.images.length; i++) {
          const imgUrl = (input.images[i] || '').trim();
          if (imgUrl) {
            await tx.insert(productImages).values({
              productId: created.id,
              url: imgUrl,
              sortOrder: i,
            });
          }
        }
      }

      // 4. Insert validated feature associations transactionally
      for (const fvId of validatedFvIds) {
        await tx.insert(productFeatures).values({
          productId: created.id,
          featureValueId: fvId,
        });
      }

      return await getProductById(created.id);
    });
  } catch (error) {
    console.error('createProduct error:', error);
    throw new Error('Failed to create product: ' + (error as Error).message, { cause: error });
  }
}

export async function updateProduct(id: number, storeId: number, input: Partial<CreateProductInput>) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Tenant Verification: Ensure product exists and belongs to storeId
      const existing = await tx
        .select()
        .from(products)
        .where(and(eq(products.id, id), eq(products.storeId, storeId)))
        .limit(1);

      if (!existing[0]) {
        throw new Error('Product not found or unauthorized');
      }

      // 2. Anti-Mass-Assignment: Explicit whitelist of updatable product fields
      const updatePayload: Record<string, any> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updatePayload.name = input.name.trim();
      if (input.price !== undefined) updatePayload.price = String(input.price);
      if (input.summary !== undefined) updatePayload.summary = input.summary.trim();
      if (input.description !== undefined) updatePayload.description = input.description.trim();
      if (input.isActive !== undefined) updatePayload.isActive = Boolean(input.isActive);

      await tx
        .update(products)
        .set(updatePayload)
        .where(and(eq(products.id, id), eq(products.storeId, storeId)));

      // 3. Update images if explicitly provided
      if (input.images !== undefined) {
        await tx.delete(productImages).where(eq(productImages.productId, id));
        for (let i = 0; i < input.images.length; i++) {
          const imgUrl = (input.images[i] || '').trim();
          if (imgUrl) {
            await tx.insert(productImages).values({
              productId: id,
              url: imgUrl,
              sortOrder: i,
            });
          }
        }
      }

      // 4. Cross-Tenant Validation & Update for feature values
      if (input.featureValueIds !== undefined) {
        const validatedFvIds = await validateFeatureValuesBelongToStore(
          tx as any,
          input.featureValueIds,
          storeId
        );

        await tx.delete(productFeatures).where(eq(productFeatures.productId, id));
        for (const fvId of validatedFvIds) {
          await tx.insert(productFeatures).values({
            productId: id,
            featureValueId: fvId,
          });
        }
      }

      return await getProductById(id);
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    throw new Error('Failed to update product: ' + (error as Error).message, { cause: error });
  }
}

export async function toggleProductActive(id: number, storeId: number) {
  try {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error('Product not found or unauthorized');
    }

    const updated = await db
      .update(products)
      .set({ isActive: !existing[0].isActive, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('toggleProductActive error:', error);
    throw new Error('Failed to toggle product status', { cause: error });
  }
}

export async function deleteProduct(id: number, storeId: number) {
  try {
    const existing = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.storeId, storeId)))
      .limit(1);

    if (!existing[0]) {
      throw new Error('Product not found or unauthorized');
    }

    await db.delete(products).where(eq(products.id, id));
    return { success: true };
  } catch (error) {
    console.error('deleteProduct error:', error);
    throw new Error('Failed to delete product', { cause: error });
  }
}

export async function getSimilarProducts(productId: number, storeId: number, limit = 4) {
  try {
    const target = await getProductById(productId);
    if (!target) return [];

    const allStoreProducts = await getStoreProducts(storeId, { onlyActive: true });
    const others = allStoreProducts.filter((p) => p.id !== productId);

    const targetFvIds = new Set(target.featureValueIds);

    // Score by number of shared feature values
    const scored = others.map((other) => {
      let sharedCount = 0;
      for (const fvId of other.featureValueIds) {
        if (targetFvIds.has(fvId)) sharedCount++;
      }
      return { product: other, sharedCount };
    });

    scored.sort((a, b) => b.sharedCount - a.sharedCount);
    return scored.slice(0, limit).map((s) => s.product);
  } catch (error) {
    console.error('getSimilarProducts error:', error);
    return [];
  }
}
