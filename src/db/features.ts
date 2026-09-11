import { eq, and, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { features, featureValues, stores } from './schema.ts';

export async function getStoreFeaturesWithValues(storeId: number) {
  try {
    const featureList = await db.select().from(features).where(eq(features.storeId, storeId));
    if (featureList.length === 0) return [];

    const featureIds = featureList.map((f) => f.id);
    const storeValues = await db
      .select()
      .from(featureValues)
      .where(inArray(featureValues.featureId, featureIds));

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

export async function addFeatureValue(featureId: number, value: string, storeId?: number) {
  try {
    // If storeId is provided, verify this feature actually belongs to this store
    if (storeId) {
      const feat = await db
        .select({ id: features.id })
        .from(features)
        .where(and(eq(features.id, featureId), eq(features.storeId, storeId)))
        .limit(1);

      if (!feat[0]) {
        throw new Error('Unauthorized: Feature does not belong to this store');
      }
    }

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

export async function deleteFeatureValue(featureValueId: number, storeId?: number) {
  try {
    // If storeId is provided, verify this value belongs to a feature of this store
    if (storeId) {
      const valRecord = await db
        .select({ valId: featureValues.id })
        .from(featureValues)
        .innerJoin(features, eq(featureValues.featureId, features.id))
        .where(and(eq(featureValues.id, featureValueId), eq(features.storeId, storeId)))
        .limit(1);

      if (!valRecord[0]) {
        throw new Error('Unauthorized: Feature value does not belong to this store');
      }
    }

    await db.delete(featureValues).where(eq(featureValues.id, featureValueId));
    return { success: true };
  } catch (error) {
    console.error('deleteFeatureValue error:', error);
    throw new Error('Failed to delete feature value', { cause: error });
  }
}
