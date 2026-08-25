import helmet from 'helmet';

/**
 * RNF-SEG6: HSTS, X-Frame-Options, X-Content-Type-Options and the rest of
 * Helmet's defaults, plus a CSP scoped to the one origin this API is ever
 * meant to be embedded by or connect out to.
 *
 * Extracted from main.ts, and tested, for the same reason `setupSwagger` is:
 * a header that is only correct in some environments is a decision, and a
 * decision that lives inline in `bootstrap()` cannot be checked by anything.
 */
export function securityHeaders(nodeEnv: string, frontendUrl: string) {
  return helmet({
    /**
     * HSTS in production only.
     *
     * The header is host-scoped and ignores the port, so serving it from
     * http://localhost:3100 tells the browser to force https:// on *every*
     * localhost port -- including the dev site on 3101, which serves no TLS.
     * The result is a fetch that fails before it leaves the browser,
     * surfacing as "check your connection" on a login that is otherwise
     * fine, and it sticks in the browser's HSTS cache long after the server
     * stops sending it (clear it at chrome://net-internals/#hsts).
     *
     * It also buys nothing here: HSTS exists to stop a downgrade to plain
     * http, and dev *is* plain http. In production the API is behind TLS
     * (deploy/dokploy.md) and the header does its job.
     */
    hsts: nodeEnv === 'production',
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'connect-src': ["'self'", frontendUrl],
        'frame-ancestors': ["'none'"],
      },
    },
  });
}
