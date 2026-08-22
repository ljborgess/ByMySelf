import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { envSchemaWithCrossChecks } from './env.schema';

/**
 * Walks up from this file until it finds the monorepo root (the directory
 * holding pnpm-workspace.yaml) so the single shared .env is found whether the
 * caller runs from src/ (ts-node, jest) or dist/ (compiled build).
 */
function findRepoRoot(): string | undefined {
  let current = __dirname;

  for (;;) {
    if (existsSync(resolve(current, 'pnpm-workspace.yaml'))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function parseEnv() {
  const repoRoot = findRepoRoot();
  if (repoRoot) {
    loadDotenv({ path: resolve(repoRoot, '.env'), quiet: true });
  }

  const result = envSchemaWithCrossChecks.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
