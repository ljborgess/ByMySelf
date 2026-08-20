import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema';

/**
 * tokenHash stores sha256(token), never the raw refresh token -- a database
 * read alone must not yield a usable credential. Unlike passwordHash this is
 * not Argon2id: the token itself is high-entropy and random (not user
 * chosen), so lookup speed matters more than slow-verify brute-force
 * resistance here.
 *
 * familyId groups the rotation chain so reuse detection can revoke every
 * token issued from the same original login in one query.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    familyId: uuid('family_id').notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_user_id_idx').on(table.userId),
    index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  ],
);
