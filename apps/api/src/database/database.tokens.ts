import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Injection tokens and types live apart from the module on purpose: importing
 * a token must not drag in the module's side effects (env parsing, pool
 * creation), so consumers and their unit tests stay cheap to load.
 */
export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');

export type DrizzleDatabase = NodePgDatabase<typeof schema>;
