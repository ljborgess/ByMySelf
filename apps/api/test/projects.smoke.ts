import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../src/config/env';
import type { DrizzleDatabase } from '../src/database/database.tokens';
import * as schema from '../src/database/schema';
import { ProjectsRepository } from '../src/projects/projects.repository';
import { notDeleted, projects } from '../src/projects/projects.schema';

type Tx = Parameters<Parameters<DrizzleDatabase['transaction']>[0]>[0];

/**
 * Verifies the projects table and ProjectsRepository against a real
 * Postgres -- the parts no unit test can check: that jsonb round-trips the
 * bilingual shape, that the unique slug constraint actually rejects a
 * duplicate, and above all that the repository's soft-delete scoping really
 * hides deleted rows.
 *
 * That last one is why this file matters. Drizzle has no ORM-level global
 * filter, so "a deleted project disappears from every query" is a promise
 * kept by ProjectsRepository applying `deletedAt IS NULL` itself. A
 * mock-based unit test could only assert that a query builder was called;
 * whether the row is actually excluded is a question for a database.
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

/**
 * Drives ProjectsRepository itself, so the soft-delete exclusion is proven
 * by observing what the database returns rather than by inspecting how the
 * query was built.
 */
async function checkRepository(tx: Tx): Promise<boolean[]> {
  const results: boolean[] = [];
  // the repository takes the injected db; a transaction satisfies the same
  // interface, which keeps this run rollback-safe
  const repository = new ProjectsRepository(tx);

  const live = await repository.create({
    title: { pt: 'Repo vivo' },
    description: { pt: 'Descrição' },
    content: { pt: 'Conteúdo' },
    slug: '__smoke-repo-live',
  });
  const doomed = await repository.create({
    title: { pt: 'Repo excluído' },
    description: { pt: 'Descrição' },
    content: { pt: 'Conteúdo' },
    slug: '__smoke-repo-doomed',
  });

  results.push(
    check(
      'repository.maxOrder reflete as linhas vivas',
      (await repository.maxOrder()) !== null,
    ),
  );

  const deleted = await repository.softDelete(doomed.id);
  results.push(
    check('repository.softDelete marca deletedAt', deleted?.deletedAt != null),
  );
  results.push(
    check(
      'repository.softDelete de novo devolve undefined, sem sobrescrever o timestamp',
      (await repository.softDelete(doomed.id)) === undefined,
    ),
  );

  const listed = await repository.findAll();
  results.push(
    check(
      'repository.findAll esconde o excluído e mantém o vivo',
      listed.some((row) => row.id === live.id) &&
        listed.every((row) => row.id !== doomed.id),
    ),
  );
  results.push(
    check(
      'repository.findAll({ includeDeleted }) volta a mostrá-lo',
      (await repository.findAll({ includeDeleted: true })).some(
        (row) => row.id === doomed.id,
      ),
    ),
  );

  results.push(
    check(
      'repository.findById esconde o excluído',
      (await repository.findById(doomed.id)) === undefined,
    ),
  );
  results.push(
    check(
      'repository.findById({ includeDeleted }) o encontra',
      (await repository.findById(doomed.id, { includeDeleted: true }))?.id ===
        doomed.id,
    ),
  );

  results.push(
    check(
      'repository.findBySlug esconde o excluído',
      (await repository.findBySlug('__smoke-repo-doomed')) === undefined,
    ),
  );
  results.push(
    check(
      'repository.findBySlug({ includeDeleted }) o encontra — é o que detecta slug preso',
      (
        await repository.findBySlug('__smoke-repo-doomed', {
          includeDeleted: true,
        })
      )?.id === doomed.id,
    ),
  );

  results.push(
    check(
      'repository.update não alcança linha excluída',
      (await repository.update(doomed.id, { featured: true })) === undefined,
    ),
  );
  results.push(
    check(
      'repository.update altera a linha viva',
      (await repository.update(live.id, { featured: true }))?.featured === true,
    ),
  );

  // applyOrdering writes one row per id inside a transaction -- what matters
  // is the state the database ends up in, which is what this observes
  const extra = await repository.create({
    title: { pt: 'Repo terceiro' },
    description: { pt: 'Descrição' },
    content: { pt: 'Conteúdo' },
    slug: '__smoke-repo-third',
  });

  await repository.applyOrdering([extra.id, live.id]);
  const afterFirstMove = await repository.findAll();
  results.push(
    check(
      'repository.applyOrdering persiste 0..n-1 na ordem pedida',
      afterFirstMove.find((row) => row.id === extra.id)?.order === 0 &&
        afterFirstMove.find((row) => row.id === live.id)?.order === 1,
    ),
  );
  results.push(
    check(
      'repository.applyOrdering deixa findAll já ordenado',
      afterFirstMove.map((row) => row.id).join(',') ===
        [extra.id, live.id].join(','),
    ),
  );

  await repository.applyOrdering([live.id, extra.id]);
  const afterSwap = await repository.findAll();
  results.push(
    check(
      'repository.applyOrdering troca a ordem sem duplicar posição',
      afterSwap.map((row) => row.order).join(',') === '0,1' &&
        afterSwap[0].id === live.id,
    ),
  );

  results.push(
    check(
      'repository.applyOrdering ignora lista vazia',
      (await repository.applyOrdering([])) === undefined,
    ),
  );

  return results;
}

async function run(): Promise<boolean> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  // full schema, not just { projects }: ProjectsRepository is typed against
  // DrizzleDatabase, and a narrower schema is not assignable to it
  const db = drizzle(pool, { schema });
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

      results.push(...(await checkRepository(tx)));

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
