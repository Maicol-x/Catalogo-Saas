import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Failed to synchronize user account', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('getUserByUid error:', error);
    throw new Error('Failed to retrieve user', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  data: { phoneNumber?: string; countryCode?: string; name?: string }
) {
  try {
    const updated = await db
      .update(users)
      .set(data)
      .where(eq(users.uid, uid))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('updateUserProfile error:', error);
    throw new Error('Failed to update user profile', { cause: error });
  }
}
