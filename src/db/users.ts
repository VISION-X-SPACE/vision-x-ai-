/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

/**
 * Retrieves the user database record matching the Firebase UID,
 * or registers them if they don't exist yet (Upsert design).
 */
export async function getOrCreateUser(uid: string, email: string) {
  try {
    // Use upsert to handle concurrent inserts of the same user ID safely.
    // Updates email if the user already exists, or inserts a new record.
    const result = await db.insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsert failed for user:", error);
    throw new Error("Unable to synchronize your user profile to PostgreSQL database.", { cause: error });
  }
}
