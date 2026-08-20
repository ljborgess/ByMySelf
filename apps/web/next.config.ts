import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { resolve } from 'node:path';

// Next only auto-loads .env files from this package's own directory, but the
// project keeps a single .env at the repo root (see root README) shared with
// the API. This reads just API_URL out of it -- not @next/env's
// loadEnvConfig, which would load the whole file into process.env. That
// file also holds JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and DATABASE_URL,
// which the public web server never uses and has no reason to be able to
// leak if this process is ever compromised.
//
// A real environment variable still wins over the file (checked first),
// matching Next's own env precedence and letting production set API_URL
// directly without touching this repo-relative path at all.
if (!process.env.API_URL) {
  const rootEnvPath = resolve(__dirname, '../../.env');
  if (existsSync(rootEnvPath)) {
    const { API_URL } = parse(readFileSync(rootEnvPath, 'utf-8'));
    if (API_URL) {
      process.env.API_URL = API_URL;
    }
  }
}

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
