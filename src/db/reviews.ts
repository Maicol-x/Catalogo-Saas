import { eq, and, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { reviews, products } from './schema.ts';

export async function getProductReviews(productId: number, onlyApproved = true) {
  try {
    let query = db.select().from(reviews).where(eq(reviews.productId, productId));
    const all = await query.orderBy(desc(reviews.createdAt));
    if (onlyApproved) {
      return all.filter((r) => r.isApproved);
    }
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
        isApproved: true,
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
    const storeProducts = await db.select().from(products).where(eq(products.storeId, storeId));
    if (storeProducts.length === 0) return [];

    const productIds = storeProducts.map((p) => p.id);
    const prodMap = new Map(storeProducts.map((p) => [p.id, p.name]));

    const allReviews = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    const relevant = allReviews.filter((r) => productIds.includes(r.productId));

    return relevant.map((r) => ({
      ...r,
      productName: prodMap.get(r.productId) || 'Producto',
    }));
  } catch (error) {
    console.error('getStoreReviews error:', error);
    throw new Error('Failed to fetch store reviews', { cause: error });
  }
}

export async function moderateReview(reviewId: number, isApproved: boolean) {
  try {
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
