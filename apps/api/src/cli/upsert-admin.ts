import { eq } from 'drizzle-orm';
import type { DrizzleDatabase } from '../database/database.tokens';
import { users } from '../users/users.schema';

export type UpsertAdminResult = 'created' | 'updated';

/**
 * There is only ever one User row (docs/dominio.md), and its email can
 * change between invocations -- an onConflictDoUpdate keyed on email would
 * insert a second row instead of updating the existing one if the admin
 * provides a different email on a later run. Select-then-branch avoids that.
 */
export async function upsertAdmin(
  db: DrizzleDatabase,
  email: string,
  passwordHash: string,
): Promise<UpsertAdminResult> {
  const [existing] = await db.select().from(users).limit(1);

  if (!existing) {
    await db.insert(users).values({ email, passwordHash });
    return 'created';
  }

  await db
    .update(users)
    .set({ email, passwordHash })
    .where(eq(users.id, existing.id));

  return 'updated';
}
