/**
 * Supplies the environment the app validates at bootstrap so e2e specs can
 * build AppModule without a developer .env present (CI included).
 */
process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3100';
process.env.FRONTEND_URL ??= 'http://localhost:3101';
process.env.GITHUB_TOKEN ??= 'test-token';
process.env.GITHUB_USERNAME ??= 'ljborgess';
