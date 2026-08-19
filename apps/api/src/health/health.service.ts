import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.tokens';
import type { DrizzleDatabase } from '../database/database.tokens';

export interface HealthStatus {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
}

/**
 * Ceiling for the database probe. A hung Postgres must not hang the health
 * check itself, otherwise the orchestrator's own timeout is what fires and it
 * cannot tell "database is down" from "app is wedged".
 */
const DB_CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.withTimeout(this.db.execute(sql`select 1`));
      return { status: 'ok', db: 'ok' };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error', db: 'error' };
    }
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `Database check timed out after ${DB_CHECK_TIMEOUT_MS}ms`,
            ),
          ),
        DB_CHECK_TIMEOUT_MS,
      );
    });

    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}
