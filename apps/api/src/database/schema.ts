/**
 * Drizzle schema root.
 *
 * Every table lives next to its domain (src/users, src/auth, ...) and gets
 * re-exported here, so drizzle-kit and the runtime always see the same set.
 */
export * from '../users/users.schema';
export * from '../auth/refresh-token.schema';
export * from '../projects/projects.schema';
