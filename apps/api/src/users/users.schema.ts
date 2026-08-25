import { sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Single-row table -- the one admin account (docs/dominio.md). No signup
 * flow ever inserts here; the row is created/reset via `pnpm cli create-admin`.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    /**
     * At most one row, enforced by the database.
     *
     * A unique index over a constant expression: every row indexes the same
     * value, so a second insert violates it. The single-account rule was
     * previously held up by `upsertAdmin` selecting before inserting -- an
     * implementation detail of one function, and a comment. Neither stops a
     * manual INSERT during an ops fix, nor a future signup route, nor someone
     * rewriting that upsert as an `onConflictDoUpdate` keyed on email (which
     * its own comment notes would insert a second row).
     *
     * The reason this matters is not tidiness. Every /admin route is
     * unscoped: the guard attaches `userId` and nothing reads it, because
     * with one account there is no one else's data to reach. A second row
     * makes all of them cross-tenant in silence -- no error, no failing test,
     * just one owner editing another's projects. This index is what turns
     * that from a silent bug into a refused write.
     *
     * When multi-user is genuinely wanted, the migration that adds ownership
     * to `projects` drops this index in the same step -- a deliberate,
     * visible decision at the moment it is actually being made.
     */
    uniqueIndex('users_single_row').on(sql`(true)`),
  ],
);
