import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { env } from '../config/env';

/**
 * Applies every pending migration in ./drizzle, creating the migration
 * tracking table on first run. Invoked via `pnpm --filter api db:migrate`.
 */
async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });

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
  process.exit(1);
});
