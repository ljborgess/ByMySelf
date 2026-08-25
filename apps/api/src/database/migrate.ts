import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { env } from '../config/env';

/**
 * Exit code for "the database is not reachable *yet*", borrowed from
 * sysexits.h EX_TEMPFAIL. The container entrypoint retries on this and only
 * this: everything else -- bad SQL, invalid credentials, a failed constraint
 * -- is permanent, and retrying it just delays a failure that a human has to
 * fix anyway.
 */
const EXIT_RETRYABLE = 75;

/**
 * Connection-level failures, as opposed to anything the server rejected.
 * These are the ones that resolve on their own once Postgres finishes
 * booting, which is the normal race on a cold `docker compose up`.
 */
const RETRYABLE_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'EAI_AGAIN',
  // Postgres is up but still starting, or shutting down
  '57P03',
  '08006',
  '08001',
]);

/**
 * Walks the error chain rather than reading `error.code` off the top.
 *
 * Node resolves a hostname to several addresses and tries them in parallel
 * ("happy eyeballs"), so a host that does not resolve surfaces as an
 * `AggregateError` whose `errors[]` carry the real `ENOTFOUND` -- the
 * top-level object has no `code` at all. Checking only the outer error
 * classified the most common transient failure (Postgres not up yet) as
 * permanent, which defeats the retry entirely.
 */
function isRetryable(error: unknown, depth = 0): boolean {
  if (error === null || typeof error !== 'object' || depth > 4) {
    return false;
  }

  const { code, cause, errors } = error as {
    code?: unknown;
    cause?: unknown;
    errors?: unknown;
  };

  if (typeof code === 'string' && RETRYABLE_CODES.has(code)) {
    return true;
  }

  if (Array.isArray(errors)) {
    return errors.some((nested) => isRetryable(nested, depth + 1));
  }

  return cause === undefined ? false : isRetryable(cause, depth + 1);
}

/**
 * Applies every pending migration in ./drizzle, creating the migration
 * tracking table on first run. Invoked via `pnpm --filter api db:migrate`,
 * and by the container entrypoint before the server starts.
 */
async function runMigrations(): Promise<void> {
  // Least privilege (#88): DATABASE_URL passa a apontar para a role
  // restrita, sem DDL. MIGRATION_DATABASE_URL é a conexão com privilégio
  // para CREATE/ALTER TABLE; cai de volta para DATABASE_URL quando ausente,
  // que é o caso em dev, onde só existe a role `postgres`.
  const pool = new Pool({
    connectionString: env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL,
  });

  try {
    const db = drizzle(pool);
    await migrate(db, {
      migrationsFolder: resolve(__dirname, '../../drizzle'),
    });
    console.log('Migrations applied successfully.');
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(isRetryable(error) ? EXIT_RETRYABLE : 1);
});
