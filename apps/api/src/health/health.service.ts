import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  DB_CONNECTION_TIMEOUT_MS,
  DB_STATEMENT_TIMEOUT_MS,
  DRIZZLE,
} from '../database/database.tokens';
import type { DrizzleDatabase } from '../database/database.tokens';

export interface HealthStatus {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  /**
   * Commit que originou esta imagem, gravado no build (`GIT_SHA`).
   *
   * Existe para o pipeline: depois de disparar o deploy, o CI faz polling
   * nesta rota e precisa distinguir o container novo do que ainda está
   * rodando. Sem isso o probe responde `ok` de imediato — vindo da versão
   * *anterior* — e um rollout que nunca começou passaria como sucesso.
   *
   * `unknown` em build local, onde ninguém passa o arg.
   */
  version: string;
}

const BUILD_SHA = process.env.GIT_SHA ?? 'unknown';

/**
 * Last-resort ceiling so a wedged driver cannot hang the probe — the
 * orchestrator must be able to tell "database is down" from "app is wedged".
 *
 * Deliberately above the driver's own budget (connection + statement): the
 * driver is what cancels the query and releases the pooled client, so it has
 * to be the one that fires first. Firing earlier here would abandon a query
 * pg still owns and leak a client on every probe.
 */
const PROBE_BACKSTOP_MS =
  DB_CONNECTION_TIMEOUT_MS + DB_STATEMENT_TIMEOUT_MS + 1000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.withTimeout(this.db.execute(sql`select 1`));
      return { status: 'ok', db: 'ok', version: BUILD_SHA };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error', db: 'error', version: BUILD_SHA };
    }
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`Database check timed out after ${PROBE_BACKSTOP_MS}ms`),
          ),
        PROBE_BACKSTOP_MS,
      );
    });

    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
