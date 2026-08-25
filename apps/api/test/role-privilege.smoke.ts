import { Pool } from 'pg';
import { env } from '../src/config/env';

/**
 * Verifica least privilege (#88) contra um Postgres real: a role de
 * DATABASE_URL consegue ler e escrever nas tabelas da app, e é recusada em
 * qualquer DDL. Como users.smoke.ts e projects.smoke.ts, manual e fora do
 * CI -- o CI usa Testcontainers efêmero (RNF-QUA2), sem relação com este
 * mecanismo de role.
 *
 * Pré-requisitos, contra o Postgres local do compose:
 *
 *   1. `pnpm --filter api db:migrate`, com DATABASE_URL apontando para a
 *      role de superusuário (o padrão do .env.example) -- cria as tabelas.
 *   2. Aponte DATABASE_URL para uma role de teste distinta, ex.
 *      `postgresql://bymyself_app_local:senha@localhost:5434/portfolio`, e
 *      defina MIGRATION_DATABASE_URL para a URL de superusuário original.
 *   3. `pnpm --filter api db:bootstrap-role` -- cria a role e aplica os
 *      GRANTs.
 *   4. `pnpm --filter api db:smoke:role`, com o DATABASE_URL do passo 2.
 *
 * A role de teste nunca é apagada por este script: é infraestrutura local
 * reutilizável, não um dado de teste.
 */

function check(label: string, passed: boolean): boolean {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${label}`);
  return passed;
}

/** Postgres recusa privilégio insuficiente com SQLSTATE 42501. */
function isInsufficientPrivilege(error: unknown): boolean {
  for (let current = error; current; current = (current as Error).cause) {
    if (typeof current !== 'object') {
      break;
    }
    const { code } = current as { code?: unknown };
    if (code === '42501') {
      return true;
    }
  }
  return false;
}

async function run(): Promise<boolean> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const results: boolean[] = [];

  try {
    const { rows: whoami } = await pool.query<{
      current_user: string;
      rolsuper: boolean;
    }>(
      'SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS rolsuper',
    );
    results.push(
      check(
        `conectado como role restrita, não superusuário (role: ${whoami[0].current_user})`,
        whoami[0].rolsuper === false,
      ),
    );

    for (const table of ['users', 'refresh_tokens', 'projects']) {
      try {
        await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
        results.push(check(`SELECT em "${table}" permitido`, true));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push(
          check(`SELECT em "${table}" permitido (foi: ${message})`, false),
        );
      }
    }

    let ddlRefused = true;
    try {
      await pool.query('CREATE TABLE role_privilege_smoke_probe (id int)');
      ddlRefused = false;
      // Se por algum motivo o CREATE passou, desfaz -- não deveria acontecer.
      await pool.query('DROP TABLE role_privilege_smoke_probe');
    } catch (error) {
      ddlRefused = isInsufficientPrivilege(error);
    }
    results.push(check('CREATE TABLE recusado (42501)', ddlRefused));

    let dropRefused = true;
    try {
      await pool.query('DROP TABLE projects');
      dropRefused = false;
    } catch (error) {
      dropRefused = isInsufficientPrivilege(error);
    }
    results.push(check('DROP TABLE recusado (42501)', dropRefused));
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
