import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../src/config/env';
import { upsertAdmin } from '../src/cli/upsert-admin';
import * as schema from '../src/database/schema';
import { users } from '../src/users/users.schema';

/**
 * Verifies the single-account invariant against a real Postgres.
 *
 * This is a database constraint, so a database is the only thing that can
 * prove it. A mock-based unit test could show that `upsertAdmin` selects
 * before inserting -- it could never show that a *different* caller is
 * refused, and that is the whole point: the index exists precisely for the
 * paths that do not go through that function.
 *
 * Why the invariant is worth a constraint at all: every /admin route is
 * unscoped. The guard attaches `userId` and nothing reads it, because with
 * one account there is no one else's data to reach. A second row would make
 * all of them cross-tenant in silence -- no error, no failing test, just one
 * owner editing another's projects. The index turns that from a silent bug
 * into a refused write.
 *
 * Manual, like projects.smoke.ts, and rollback-safe. Run against the local
 * compose Postgres, after `pnpm --filter api db:migrate`:
 *
 *     pnpm --filter api db:smoke:users
 */

function check(label: string, passed: boolean): boolean {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
  return passed;
}

/**
 * Postgres reports a unique violation as SQLSTATE 23505, naming the
 * constraint it refused on.
 *
 * Walks the `cause` chain rather than reading the fields off the top:
 * Drizzle wraps the driver error, so the outer object carries neither
 * `code` nor `constraint` -- the same reason migrate.ts walks the chain
 * for connection errors. Reading only the outer one reports "not a unique
 * violation" for a write the database did refuse.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error; current; current = (current as Error).cause) {
    if (typeof current !== 'object') {
      break;
    }
    const { code, constraint: violated } = current as {
      code?: unknown;
      constraint?: unknown;
    };
    if (code === '23505' && violated === constraint) {
      return true;
    }
  }
  return false;
}

/** O nome da constraint recusada, para a mensagem do teste dizer o que houve. */
function violatedConstraint(error: unknown): string {
  for (let current = error; current; current = (current as Error).cause) {
    if (typeof current !== 'object') {
      break;
    }
    const { constraint } = current as { constraint?: unknown };
    if (typeof constraint === 'string') {
      return constraint;
    }
  }
  return '?';
}

async function run(): Promise<boolean> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const results: boolean[] = [];

  try {
    await db.transaction(async (tx) => {
      const before = await tx.select().from(users);
      results.push(check('o banco parte de uma conta só', before.length === 1));

      // Um e-mail diferente, de propósito: com o mesmo e-mail quem recusaria
      // seria `users_email_unique`, e o teste não diria nada sobre a
      // invariante de linha única.
      let refused = false;
      let refusedBy = '';
      try {
        await tx
          .insert(users)
          .values({ email: 'segundo@exemplo.com', passwordHash: 'hash' });
      } catch (error) {
        refused = isUniqueViolation(error, 'users_single_row');
        refusedBy = violatedConstraint(error);
      }
      results.push(
        check(
          `um segundo insert é recusado por users_single_row (foi: ${refusedBy || 'aceito'})`,
          refused,
        ),
      );
    });
  } catch (error) {
    // Um insert recusado aborta a transação inteira no Postgres, então o
    // bloco acima sempre sai por aqui. É esperado.
    if (!isUniqueViolation(error, 'users_single_row')) {
      throw error;
    }
  }

  // Segunda transação: a primeira ficou abortada pelo insert recusado.
  try {
    await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(users);

      // O caminho normal de troca de conta continua funcionando: atualiza a
      // linha existente em vez de tentar uma segunda.
      const result = await upsertAdmin(tx, 'trocado@exemplo.com', 'outro-hash');
      results.push(
        check('upsertAdmin atualiza em vez de inserir', result === 'updated'),
      );

      const after = await tx.select().from(users);
      results.push(
        check(
          'continua havendo exatamente uma linha, com o mesmo id',
          after.length === 1 && after[0].id === existing.id,
        ),
      );
      results.push(
        check(
          'o e-mail foi de fato trocado',
          after[0].email === 'trocado@exemplo.com',
        ),
      );

      // nunca deixa a conta de verdade alterada
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Rollback')) {
      throw error;
    }
  } finally {
    await pool.end();
  }

  return results.every(Boolean);
}

run()
  .then((passed) => {
    console.log(passed ? '\nSmoke test OK.' : '\nSmoke test FALHOU.');
    process.exit(passed ? 0 : 1);
  })
  .catch((error: unknown) => {
    console.error('Smoke test não pôde rodar:', error);
    process.exit(1);
  });
