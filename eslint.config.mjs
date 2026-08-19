// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Rescopes a set of flat config objects to only apply under `dir`, so
 * app-specific plugin configs (Next.js, NestJS) never touch other apps.
 */
function scoped(dir, configs) {
  return configs.map((config) => ({
    ...config,
    files: (config.files ?? ['**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}']).map(
      (pattern) => `${dir}/${pattern}`,
    ),
  }));
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
  {
    files: ['apps/api/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: `${import.meta.dirname}/apps/api`,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
  ...scoped('apps/web', [...nextCoreWebVitals, ...nextTypescript]),
);
