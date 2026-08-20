import { loadEnvConfig } from '@next/env';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { resolve } from 'node:path';

// Next only auto-loads .env files from this package's own directory, but the
// project keeps a single .env at the repo root (see root README) shared with
// the API. Loading it here is what makes API_URL (lib/projects.ts) reach
// process.env before any page renders.
loadEnvConfig(resolve(__dirname, '../..'));

const nextConfig: NextConfig = {
  // next-intl and its use-intl core ship as untranspiled ESM. Listing them
  // here is also what makes them testable: next/jest derives
  // transformIgnorePatterns from this field, and a custom Jest config can only
  // append ignores, never lift the blanket node_modules exclusion. Without
  // this, importing next-intl in a test fails on `Unexpected token 'export'`.
  // The whole use-intl subtree, not just next-intl: every one of these is
  // `"type": "module"`, and the pattern matches exact package names rather
  // than dependency trees, so a transitive one left out fails the same way.
  transpilePackages: [
    'next-intl',
    'use-intl',
    'intl-messageformat',
    'icu-minify',
    '@formatjs/fast-memoize',
    '@formatjs/icu-messageformat-parser',
    '@formatjs/icu-skeleton-parser',
    '@formatjs/intl-localematcher',
    '@schummar/icu-type-parser',
  ],
};

// Points next-intl at i18n/request.ts, which is what makes the server-side
// message lookup work. Without the plugin the app builds and renders, but
// every translated string comes back missing.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
