import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { reviews, products } from './schema.ts';

export async function getProductReviews(productId: number, onlyApproved = true) {
  try {
    const conditions = [eq(reviews.productId, productId)];
    if (onlyApproved) {
      conditions.push(eq(reviews.isApproved, true));
    }
    const all = await db
      .select()
      .from(reviews)
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt));
    return all;
  } catch (error) {
    console.error('getProductReviews error:', error);
    throw new Error('Failed to fetch reviews', { cause: error });
  }
}

export async function createReview(
  productId: number,
  data: { authorName: string; rating: number; comment: string },
  storeId?: number
) {
  try {
    // If storeId is provided, strictly verify that the target product belongs to that store and is active
    if (storeId) {
      const prod = await db
        .select({ id: products.id, storeId: products.storeId, isActive: products.isActive })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
        .limit(1);

      if (!prod[0] || !prod[0].isActive) {
        throw new Error('Producto no encontrado o no disponible para recibir reseñas en este catálogo');
      }
    } else {
      const prod = await db
        .select({ id: products.id, isActive: products.isActive })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!prod[0] || !prod[0].isActive) {
        throw new Error('Producto no encontrado o no disponible para recibir reseñas');
      }
    }

    const safeRating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 5)));
    const safeAuthor = (data.authorName || 'Cliente').trim().slice(0, 80);
    const safeComment = (data.comment || '').trim().slice(0, 1000);

    if (!safeAuthor || !safeComment) {
      throw new Error('El nombre y el comentario son requeridos');
    }

    const res = await db
      .insert(reviews)
      .values({
        productId,
        authorName: safeAuthor,
        rating: safeRating,
        comment: safeComment,
        isApproved: false, // Starts as pending moderation by merchant
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('createReview error:', error);
    throw new Error('Failed to create review: ' + (error as Error).message, { cause: error });
  }
}

export async function getStoreReviews(storeId: number) {
  try {
    const storeProducts = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.storeId, storeId));

    if (storeProducts.length === 0) return [];

    const productIds = storeProducts.map((p) => p.id);
    const prodMap = new Map(storeProducts.map((p) => [p.id, p.name]));

    const relevant = await db
      .select()
      .from(reviews)
      .where(inArray(reviews.productId, productIds))
      .orderBy(desc(reviews.createdAt));

    return relevant.map((r) => ({
      ...r,
      productName: prodMap.get(r.productId) || 'Producto',
    }));
  } catch (error) {
    console.error('getStoreReviews error:', error);
    throw new Error('Failed to fetch store reviews', { cause: error });
  }
}

export async function moderateReview(reviewId: number, isApproved: boolean, storeId?: number) {
  try {
    // If storeId is provided, verify this review belongs to a product in this store
    if (storeId) {
      const reviewRecord = await db
        .select({
          reviewId: reviews.id,
          storeId: products.storeId,
        })
        .from(reviews)
        .innerJoin(products, eq(reviews.productId, products.id))
        .where(and(eq(reviews.id, reviewId), eq(products.storeId, storeId)));

      if (reviewRecord.length === 0) {
        throw new Error('Unauthorized: Review does not belong to this store');
      }
    }

    const res = await db
      .update(reviews)
      .set({ isApproved })
      .where(eq(reviews.id, reviewId))
      .returning();
    return res[0];
  } catch (error) {
    console.error('moderateReview error:', error);
    throw new Error('Failed to moderate review', { cause: error });
  }
}
