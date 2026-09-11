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
  data: { authorName: string; rating: number; comment: string }
) {
  try {
    const res = await db
      .insert(reviews)
      .values({
        productId,
        authorName: data.authorName.trim(),
        rating: Math.max(1, Math.min(5, data.rating)),
        comment: data.comment.trim(),
        isApproved: false, // Starts as pending moderation by merchant
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('createReview error:', error);
    throw new Error('Failed to create review', { cause: error });
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
