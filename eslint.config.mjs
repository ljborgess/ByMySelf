// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const prefix = (dir, patterns) =>
  patterns.map((pattern) => `${dir}/${pattern}`);

/**
 * Rescopes a set of flat config objects to only apply under `dir`, so
 * app-specific plugin configs (Next.js, NestJS) never touch other apps.
 *
 * A flat config carrying only `ignores` is a *global* ignore. Giving it a
 * `files` key would demote it to a file-scoped config and silently stop it
 * from ignoring anything — which is how generated output under apps/web/out
 * ended up being linted. Those objects are re-rooted and passed through
 * without `files`.
 */
function scoped(dir, configs) {
  return configs.map((config) => {
    const { files, ignores, ...rest } = config;
    const isGlobalIgnore = ignores && !files && Object.keys(rest).length === 0;

    if (isGlobalIgnore) {
      return { ignores: prefix(dir, ignores) };
    }

    return {
      ...config,
      files: prefix(dir, files ?? ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}']),
      ...(ignores ? { ignores: prefix(dir, ignores) } : {}),
    };
  });
}

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      'apps/web/next-env.d.ts',
      'docs/**',
      '.claude/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  ...scoped('apps/web', [...nextCoreWebVitals, ...nextTypescript]),
  {
    // Without this the @next/next plugin resolves the app root to the repo
    // root, prints "Pages directory cannot be found" on every run, and
    // no-html-link-for-pages silently does nothing.
    files: ['apps/web/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}'],
    settings: { next: { rootDir: 'apps/web' } },
  },
);
