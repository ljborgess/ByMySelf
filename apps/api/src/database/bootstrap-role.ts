import pg, { Pool } from 'pg';
import { env } from '../config/env';

/**
 * Garante que a role de DATABASE_URL existe e tem só os privilégios que a
 * app usa -- least privilege (#88). Roda depois das migrations no
 * docker-entrypoint.sh, com a conexão de MIGRATION_DATABASE_URL (privilégio
 * de DDL), e é idempotente: cada boot reaplica os mesmos GRANTs.
 *
 * Nenhum nome de role fixo -- é o username embutido em DATABASE_URL. Isso
 * evita uma convenção nova que possa divergir do que está de fato na URL.
 *
 * Sem retry como migrate.ts: se chegou até aqui, as migrations já provaram
 * que o Postgres responde. Qualquer falha daqui em diante é permanente
 * (privilégio insuficiente na role de migração, sintaxe, etc).
 */
async function bootstrapRole(): Promise<void> {
  const migrationUrl = env.MIGRATION_DATABASE_URL ?? env.DATABASE_URL;
  const appUrl = new URL(env.DATABASE_URL);
  const appUser = decodeURIComponent(appUrl.username);
  const appPassword = decodeURIComponent(appUrl.password);

  // Caso dev: sem MIGRATION_DATABASE_URL, as duas apontam para a mesma role
  // (`postgres`). Nada a fazer -- e nada a arriscar: sem este corte, o passo
  // abaixo tentaria `ALTER ROLE postgres NOSUPERUSER` na própria conexão que
  // está usando.
  if (appUser === new URL(migrationUrl).username) {
    console.log(
      `bootstrap-role: DATABASE_URL e MIGRATION_DATABASE_URL usam a mesma role ("${appUser}") -- nada a fazer.`,
    );
    return;
  }

  const pool = new Pool({ connectionString: migrationUrl });
  const role = pg.escapeIdentifier(appUser);
  const password = pg.escapeLiteral(appPassword);

  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [appUser],
    );

    if (rows.length === 0) {
      await pool.query(
        `CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD ${password}`,
      );
      console.log(`bootstrap-role: role "${appUser}" criada.`);
    } else {
      await pool.query(
        `ALTER ROLE ${role} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD ${password}`,
      );
      console.log(
        `bootstrap-role: role "${appUser}" já existia, atributos reafirmados.`,
      );
    }

    await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    );

    console.log(
      `bootstrap-role: "${appUser}" com SELECT/INSERT/UPDATE/DELETE nas tabelas de public, sem privilégio de DDL.`,
    );
  } finally {
    await pool.end();
  }
}

bootstrapRole().catch((error) => {
  console.error('bootstrap-role falhou:', error);
  process.exit(1);
});
