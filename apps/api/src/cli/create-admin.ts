import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import prompts from 'prompts';
import { z } from 'zod';
import { hashPassword } from '../auth/password';
import { env } from '../config/env';
import * as schema from '../database/schema';
import { upsertAdmin } from './upsert-admin';

const EMAIL_FLAG_PREFIX = '--email=';

function readEmailFlag(argv: string[]): string | undefined {
  const flag = argv.find((arg) => arg.startsWith(EMAIL_FLAG_PREFIX));
  return flag?.slice(EMAIL_FLAG_PREFIX.length);
}

/**
 * Creates the admin account on a fresh database, or resets its email/
 * password on an existing one -- the only recovery path, since there is no
 * "forgot password" flow (docs/arquitetura.md). Email is accepted as a
 * flag; the password is always prompted for interactively and masked, per
 * the issue's own requirement -- a plain CLI argument would land in shell
 * history and process listings.
 */
export async function runCreateAdmin(argv: string[]): Promise<void> {
  const emailFromFlag = readEmailFlag(argv);

  const answers = await prompts(
    [
      {
        type: emailFromFlag ? null : 'text',
        name: 'email',
        message: 'Admin email',
        validate: (value: string) =>
          z.email().safeParse(value).success || 'Enter a valid email address',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Admin password',
        validate: (value: string) =>
          value.length > 0 || 'Password cannot be empty',
      },
    ],
    {
      onCancel: () => {
        console.error('Aborted.');
        process.exit(1);
      },
    },
  );

  const email = emailFromFlag ?? (answers.email as string);
  const password = answers.password as string;
  const passwordHash = await hashPassword(password);

  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    const db = drizzle(pool, { schema });
    const result = await upsertAdmin(db, email, passwordHash);
    console.log(`Admin account ${result}: ${email}`);
  } finally {
    await pool.end();
  }
}
