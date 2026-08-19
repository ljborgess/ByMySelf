import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import { DRIZZLE, DrizzleDatabase, PG_POOL } from './database.tokens';
import * as schema from './schema';

export { DRIZZLE, PG_POOL };
export type { DrizzleDatabase };

const poolLogger = new Logger('DatabasePool');

function createPool(): Pool {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });

  // pg emits 'error' on idle clients when Postgres goes away. With no listener
  // Node treats it as an unhandled 'error' event and kills the process — the
  // app would die exactly when /health should be reporting 503 instead.
  pool.on('error', (error) => {
    poolLogger.error('Idle client error', error);
  });

  return pool;
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: createPool,
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDatabase => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
