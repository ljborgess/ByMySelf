import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import { assertNoSuperuserInProduction } from './assert-role-privilege';
import {
  DB_CONNECTION_TIMEOUT_MS,
  DB_STATEMENT_TIMEOUT_MS,
  DRIZZLE,
  DrizzleDatabase,
  PG_POOL,
} from './database.tokens';
import * as schema from './schema';

export { DRIZZLE, PG_POOL };
export type { DrizzleDatabase };

const poolLogger = new Logger('DatabasePool');

function createPool(): Pool {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
    // Postgres cancels the query server-side and the client goes back to the
    // pool healthy; query_timeout is the client-side backstop if the server
    // never answers at all. Without these a caller-side timeout would abandon
    // the query and leak its pooled client.
    statement_timeout: DB_STATEMENT_TIMEOUT_MS,
    query_timeout: DB_STATEMENT_TIMEOUT_MS,
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
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  // Least privilege (#88), user story 3: recusa subir em produção se a
  // conexão está usando uma role superusuário -- no espírito do que
  // env.schema.ts já faz para segredo curto e COOKIE_DOMAIN de loopback,
  // só que esta checagem depende de uma conexão real, então não cabe lá.
  async onModuleInit(): Promise<void> {
    await assertNoSuperuserInProduction(this.pool, env.NODE_ENV);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
