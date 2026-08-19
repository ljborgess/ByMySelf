/**
 * Supplies the environment the app validates at bootstrap so e2e specs can
 * build AppModule without a developer .env present (CI included).
 *
 * These are throwaway values: the pg Pool connects lazily, so no real Postgres
 * is contacted until a spec actually issues a query. Integration tests against
 * a real database arrive later with Testcontainers.
 */
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@localhost:5432/portfolio_test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRATION ??= '15m';
process.env.JWT_REFRESH_EXPIRATION ??= '30d';
process.env.COOKIE_DOMAIN ??= 'localhost';
process.env.FRONTEND_URL ??= 'http://localhost:3001';
