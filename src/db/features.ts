import { eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import { features, featureValues, stores } from './schema.ts';

export async function getStoreFeaturesWithValues(storeId: number) {
  try {
    const featureList = await db.select().from(features).where(eq(features.storeId, storeId));
    if (featureList.length === 0) return [];

    const featureIds = featureList.map((f) => f.id);
    const allValues = await db.select().from(featureValues);
    const storeValues = allValues.filter((v) => featureIds.includes(v.featureId));

    return featureList.map((f) => ({
      ...f,
      values: storeValues.filter((v) => v.featureId === f.id),
    }));
  } catch (error) {
    console.error('getStoreFeaturesWithValues error:', error);
    throw new Error('Failed to fetch store features', { cause: error });
  }
}

export async function createFeature(storeId: number, name: string, initialValues: string[] = []) {
  try {
    const insertedFeature = await db
      .insert(features)
      .values({
        storeId,
        name: name.trim(),
      })
      .returning();

    const created = insertedFeature[0];
    const createdValues = [];

    for (const val of initialValues) {
      if (val.trim()) {
        const valRes = await db
          .insert(featureValues)
          .values({
            featureId: created.id,
            value: val.trim(),
          })
          .returning();
        createdValues.push(valRes[0]);
      }
    }

    return {
      ...created,
      values: createdValues,
    };
  } catch (error) {
    console.error('createFeature error:', error);
    throw new Error('Failed to create feature: ' + (error as Error).message, { cause: error });
  }
}

export async function addFeatureValue(featureId: number, value: string) {
  try {
    const res = await db
      .insert(featureValues)
      .values({
        featureId,
        value: value.trim(),
      })
      .returning();
    return res[0];
  } catch (error) {
    console.error('addFeatureValue error:', error);
    throw new Error('Failed to add feature value', { cause: error });
  }
}

export async function deleteFeature(featureId: number, storeId: number) {
  try {
    // Verify feature belongs to store
    const feat = await db
      .select()
      .from(features)
      .where(and(eq(features.id, featureId), eq(features.storeId, storeId)))
      .limit(1);

    if (!feat[0]) {
      throw new Error('Feature not found or unauthorized');
    }

    await db.delete(features).where(eq(features.id, featureId));
    return { success: true };
  } catch (error) {
    console.error('deleteFeature error:', error);
    throw new Error('Failed to delete feature', { cause: error });
  }
}

export async function deleteFeatureValue(featureValueId: number) {
  try {
    await db.delete(featureValues).where(eq(featureValues.id, featureValueId));
    return { success: true };
  } catch (error) {
    console.error('deleteFeatureValue error:', error);
    throw new Error('Failed to delete feature value', { cause: error });
  }
}
