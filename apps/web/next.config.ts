import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { resolve } from 'node:path';

// Next only auto-loads .env files from this package's own directory, but the
// project keeps a single .env at the repo root (see root README) shared with
// the API. This reads just API_URL and FRONTEND_URL out of it -- not
// @next/env's loadEnvConfig, which would load the whole file into
// process.env. That file also holds JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
// and DATABASE_URL, which the public web server never uses and has no reason
// to be able to leak if this process is ever compromised.
//
// FRONTEND_URL is this app's own canonical public URL (the API already uses
// it for CORS, see apps/api/src/main.ts) -- reused here as the SEO metadata
// base rather than adding a second env var for the same URL.
//
// A real environment variable still wins over the file (checked first),
// matching Next's own env precedence and letting production set these
// directly without touching this repo-relative path at all.
if (!process.env.API_URL || !process.env.FRONTEND_URL) {
  const rootEnvPath = resolve(__dirname, '../../.env');
  if (existsSync(rootEnvPath)) {
    const { API_URL, FRONTEND_URL } = parse(readFileSync(rootEnvPath, 'utf-8'));
    if (!process.env.API_URL && API_URL) {
      process.env.API_URL = API_URL;
    }
    if (!process.env.FRONTEND_URL && FRONTEND_URL) {
      process.env.FRONTEND_URL = FRONTEND_URL;
    }
  }
}

/**
 * The API is hardened with Helmet (issue #18); the public site had no
 * equivalent, so it was serving HTML with no CSP, no sniffing protection and
 * no framing policy at all.
 *
 * The CSP is written for what this site actually is: server-rendered pages
 * with no third-party scripts.
 *
 * `'unsafe-inline'` appears twice, both times deliberately. On `style-src`
 * it is required by next/font and Tailwind's injected styles. On
 * `script-src` it is what Next needs to stream the RSC payload through
 * inline script tags -- the alternative is per-request nonces, which have to
 * be generated in the proxy and force every page into dynamic rendering,
 * giving up the static prerendering i18n/request.ts went out of its way to
 * preserve. Not worth it for a site that runs no third-party JavaScript.
 *
 * `img-src` stays open to https because cover images and the profile photo
 * are arbitrary owner-pasted URLs (see profile-avatar.tsx).
 *
 * HSTS is absent on purpose: it belongs at the TLS terminator, which epic #5
 * sets up. Sending it from here while the app also answers on plain http in
 * dev would be the wrong layer.
 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * `'unsafe-eval'`, in development only. React's dev build calls `eval()` to
 * rebuild callstacks across the server/client boundary; blocking it does not
 * fail the page but it silently breaks error overlays and stack traces, which
 * is exactly the tooling a developer is relying on when something is already
 * wrong. React never uses `eval()` in a production build, so the production
 * policy stays closed.
 *
 * Found by running the app: the dev overlay reports it as an issue and the
 * server log carries React's own warning about it.
 */
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  // next/font/google self-hosts at build time -- the rendered page makes no
  // request to fonts.googleapis.com or fonts.gstatic.com, so allowing them
  // would widen the policy for traffic that does not exist
  "font-src 'self'",
  "img-src 'self' https: data: blob:",
  "connect-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // redundant with frame-ancestors above, kept for crawlers and proxies that
  // still only understand this one
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  /**
   * Emits `.next/standalone`, a self-contained server with only the traced
   * dependencies, so the runtime image does not need node_modules at all
   * (RNF-INF1 -- see apps/web/Dockerfile).
   *
   * `outputFileTracingRoot` is required here and not optional: tracing
   * defaults to this package's directory, which in a pnpm workspace would
   * miss `packages/shared` and every symlinked dependency hoisted to the
   * repo root, producing an image that builds and then crashes on a missing
   * module at first request.
   */
  output: 'standalone',
  outputFileTracingRoot: resolve(__dirname, '../..'),

  // `X-Powered-By: Next.js` names the framework on every response and buys
  // nothing in return
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

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
    // react-markdown (project detail page, RF-PUB2) and its full
    // remark/rehype/unified dependency tree: same untranspiled-ESM situation
    // as next-intl above, and the same reason every one of these has to be
    // listed individually rather than just 'react-markdown'.
    'react-markdown',
    'remark-gfm',
    'remark-parse',
    'remark-rehype',
    'remark-stringify',
    'rehype-highlight',
    'unified',
    'bail',
    'is-plain-obj',
    'trough',
    'vfile',
    'vfile-message',
    'unist-util-find-after',
    'unist-util-is',
    'unist-util-position',
    'unist-util-stringify-position',
    'unist-util-visit',
    'unist-util-visit-parents',
    'mdast-util-find-and-replace',
    'mdast-util-from-markdown',
    'mdast-util-gfm',
    'mdast-util-gfm-autolink-literal',
    'mdast-util-gfm-footnote',
    'mdast-util-gfm-strikethrough',
    'mdast-util-gfm-table',
    'mdast-util-gfm-task-list-item',
    'mdast-util-mdx-expression',
    'mdast-util-mdx-jsx',
    'mdast-util-mdxjs-esm',
    'mdast-util-phrasing',
    'mdast-util-to-hast',
    'mdast-util-to-markdown',
    'mdast-util-to-string',
    'micromark',
    'micromark-core-commonmark',
    'micromark-extension-gfm',
    'micromark-extension-gfm-autolink-literal',
    'micromark-extension-gfm-footnote',
    'micromark-extension-gfm-strikethrough',
    'micromark-extension-gfm-table',
    'micromark-extension-gfm-tagfilter',
    'micromark-extension-gfm-task-list-item',
    'micromark-factory-destination',
    'micromark-factory-label',
    'micromark-factory-space',
    'micromark-factory-title',
    'micromark-factory-whitespace',
    'micromark-util-character',
    'micromark-util-chunked',
    'micromark-util-classify-character',
    'micromark-util-combine-extensions',
    'micromark-util-decode-numeric-character-reference',
    'micromark-util-decode-string',
    'micromark-util-encode',
    'micromark-util-html-tag-name',
    'micromark-util-normalize-identifier',
    'micromark-util-resolve-all',
    'micromark-util-sanitize-uri',
    'micromark-util-subtokenize',
    'micromark-util-symbol',
    'micromark-util-types',
    'decode-named-character-reference',
    'character-entities',
    'character-entities-html4',
    'character-entities-legacy',
    'property-information',
    'hast-util-is-element',
    'hast-util-to-jsx-runtime',
    'hast-util-to-text',
    'hast-util-whitespace',
    'space-separated-tokens',
    'comma-separated-tokens',
    'html-url-attributes',
    'zwitch',
    'longest-streak',
    'ccount',
    'escape-string-regexp',
    'markdown-table',
    'trim-lines',
    'devlop',
    'stringify-entities',
    'lowlight',
    'highlight.js',
    'fault',
    'extend',
    'estree-util-is-identifier-name',
    'inline-style-parser',
    'style-to-object',
  ],
};

// Points next-intl at i18n/request.ts, which is what makes the server-side
// message lookup work. Without the plugin the app builds and renders, but
// every translated string comes back missing.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
