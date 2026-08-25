import { Pool } from 'pg';

/**
 * Least privilege (#88), user story 3: a checagem em si, e não só a role
 * criada por bootstrap-role.ts. Uma role errada em DATABASE_URL -- copiada
 * de outro ambiente, ou um deploy que nunca rodou o bootstrap -- não deveria
 * silenciosamente rodar como superusuário em produção só porque a URL
 * "funciona".
 *
 * `current_user` e não um nome esperado: a checagem vale para qualquer role
 * que a conexão de fato usa, sem precisar saber o nome de antemão.
 */
export async function assertNoSuperuserInProduction(
  pool: Pick<Pool, 'query'>,
  nodeEnv: string,
): Promise<void> {
  if (nodeEnv !== 'production') {
    return;
  }

  const { rows } = await pool.query<{ rolsuper: boolean }>(
    'SELECT rolsuper FROM pg_roles WHERE rolname = current_user',
  );

  if (rows[0]?.rolsuper) {
    throw new Error(
      'DATABASE_URL connects as a superuser role in production -- refusing to start. ' +
        'Least privilege (#88) requires the app to run as a restricted role; run bootstrap-role and point DATABASE_URL at it.',
    );
  }
}
