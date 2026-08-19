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

/**
 * Timeout budget for a database round trip, enforced by the driver so a slow
 * or wedged query is cancelled and its pooled client released. Callers that
 * add their own timeout must stay above the sum of these two, otherwise they
 * abandon a query the driver still owns and leak the client.
 */
export const DB_CONNECTION_TIMEOUT_MS = 2000;
export const DB_STATEMENT_TIMEOUT_MS = 2000;
