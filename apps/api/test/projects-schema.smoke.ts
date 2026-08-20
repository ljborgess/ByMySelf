import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../src/config/env';
import { notDeleted, projects } from '../src/projects/projects.schema';

/**
 * Verifies the projects table against a real Postgres, which is the part of
 * a schema no unit test can check: that jsonb round-trips the bilingual
 * shape, that the unique slug constraint actually rejects a duplicate, and
 * that the soft-delete predicate hides a deleted row.
 *
 * Manual on purpose -- automated integration coverage arrives with
 * Testcontainers in Fase 2 (RNF-QUA2). Run against the local compose
 * Postgres, after `pnpm --filter api db:migrate`:
 *
 *     pnpm --filter api db:smoke
 *
 * Rolls back everything it inserts, so it is safe to re-run.
 */

const SLUG = '__smoke-test-project';

function check(label: string, passed: boolean): boolean {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
  return passed;
}

async function run(): Promise<boolean> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool, { schema: { projects } });
  const results: boolean[] = [];

  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(projects)
        .values({
          title: { pt: 'Projeto de fumaça' },
          description: { pt: 'Descrição curta' },
          content: { pt: '# Conteúdo' },
          slug: SLUG,
          techStack: ['NestJS', 'PostgreSQL'],
          status: 'completed',
          completedAt: '2026-03-01',
        })
        .returning();

      results.push(check('insere uma linha', Boolean(inserted)));

      // jsonb must come back as the object it went in as, not a string
      results.push(
        check(
          'jsonb preserva o formato bilíngue',
          inserted.title.pt === 'Projeto de fumaça' &&
            inserted.title.en === undefined,
        ),
      );
      results.push(
        check(
          'text[] preserva a ordem do techStack',
          inserted.techStack.length === 2 && inserted.techStack[0] === 'NestJS',
        ),
      );
      results.push(
        check(
          'defaults aplicados (status/featured/order)',
          inserted.status === 'completed' &&
            inserted.featured === false &&
            inserted.order === 0,
        ),
      );
      results.push(
        check(
          'completedAt é uma data, sem hora',
          inserted.completedAt === '2026-03-01',
        ),
      );

      // the constraint the listing and detail routes depend on
      let duplicateRejected = false;
      try {
        await tx.transaction(async (nested) => {
          await nested.insert(projects).values({
            title: { pt: 'Outro' },
            description: { pt: 'Outro' },
            content: { pt: 'Outro' },
            slug: SLUG,
          });
        });
      } catch {
        duplicateRejected = true;
      }
      results.push(check('slug duplicado é rejeitado', duplicateRejected));

      // soft delete: the row stays, the default predicate stops seeing it
      await tx
        .update(projects)
        .set({ deletedAt: new Date() })
        .where(eq(projects.id, inserted.id));

      const visible = await tx
        .select()
        .from(projects)
        .where(and(eq(projects.id, inserted.id), notDeleted));
      results.push(
        check(
          'linha soft-deleted some com o predicado padrão',
          visible.length === 0,
        ),
      );

      const stillThere = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, inserted.id));
      results.push(
        check(
          'linha soft-deleted continua no banco (recuperável)',
          stillThere.length === 1 && stillThere[0].deletedAt !== null,
        ),
      );

      const liveOnly = await tx
        .select()
        .from(projects)
        .where(isNull(projects.deletedAt));
      results.push(
        check(
          'listagem padrão não traz a linha excluída',
          liveOnly.every((row) => row.id !== inserted.id),
        ),
      );

      // never leave the smoke row behind
      tx.rollback();
    });
  } catch (error) {
    // tx.rollback() throws by design to unwind the transaction
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
