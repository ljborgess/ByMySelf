import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

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

/**
 * `'self'` alone is enough: every fetch to the API happens server-side
 * (docs/decisao-projetos-github-pins.md's proxy decision), never from the
 * browser, so `connect-src` never needs the API's origin.
 */
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

/**
 * Origens de loopback que o dev server aceita servir.
 *
 * O Next 16 recusa com 403 uma requisição a `/_next/*` cujo `Origin` ele não
 * reconheça — proteção para que um site aberto noutra aba não leia o servidor
 * de desenvolvimento. O padrão cobre só o host pelo qual o servidor foi
 * acessado.
 *
 * Na prática o `next dev` anuncia vários endereços no boot (loopback e o IP
 * da máquina), e `localhost` e `127.0.0.1` são o mesmo computador com duas
 * grafias. Abrir por uma grafia diferente da esperada faz três chunks do app
 * voltarem 403 — e o efeito é traiçoeiro: a página renderiza inteira, o
 * formulário aparece, e nada no console avisa. Só que o React nunca hidrata,
 * então o `onSubmit` não existe e o browser faz o submit nativo do
 * formulário: um GET com e-mail e senha na query string, sem nunca falar com
 * a API.
 *
 * Vale apenas em desenvolvimento; `next build` ignora este campo.
 */
const allowedDevOrigins = ['localhost', '127.0.0.1', '[::1]'];

const nextConfig: NextConfig = {
  allowedDevOrigins,

  // `X-Powered-By: Next.js` names the framework on every response and buys
  // nothing in return
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  /**
   * `/formacao` and `/certificados` merged into `/credenciais` (#154): the
   * site is already indexed (RF-SEO3), so a bare 404 would strand any saved
   * or crawled link instead of forwarding it. Hardcoded to `/pt` because
   * `i18n/routing.ts` only lists that one locale today -- add an `/en`
   * pair here whenever Fase 3 adds that locale.
   */
  async redirects() {
    return [
      {
        source: '/pt/formacao',
        destination: '/pt/credenciais',
        permanent: true,
      },
      {
        source: '/pt/certificados',
        destination: '/pt/credenciais',
        permanent: true,
      },
    ];
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
  ],
};

// Points next-intl at i18n/request.ts, which is what makes the server-side
// message lookup work. Without the plugin the app builds and renders, but
// every translated string comes back missing.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
