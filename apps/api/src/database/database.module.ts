import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');

export type DrizzleDatabase = NodePgDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => new Pool({ connectionString: env.DATABASE_URL }),
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
