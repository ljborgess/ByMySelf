import ms from 'ms';
import { z } from 'zod';

// AuthService parses this with `ms()` on every login to compute cookie
// Max-Age and RefreshToken.expiresAt. `ms()` returns `undefined` instead of
// throwing on an unparseable string, which would otherwise only surface as a
// 500 on the first login after a typo'd .env -- reject it here instead, so
// an invalid value fails fast at startup (RNF-INF3) like every other env var.
function parseDuration(value: string): number | undefined {
  const parsed = ms(value as ms.StringValue);
  return typeof parsed === 'number' ? parsed : undefined;
}

/**
 * RNF-SEG4 puts concrete bounds on both lifetimes -- access 15 minutes,
 * refresh 7 to 30 days. Checking only that the string parses would let a
 * typo like "15d" for the access token boot happily and silently hand out
 * credentials valid for a fortnight, which is exactly the failure the short
 * access-token lifetime exists to prevent.
 */
function durationSchema(minMs: number, maxMs: number, examples: string) {
  return z
    .string()
    .min(1)
    .refine((value) => parseDuration(value) !== undefined, {
      message: `must be a valid duration string (e.g. ${examples})`,
    })
    .refine(
      (value) => {
        const parsed = parseDuration(value);
        return parsed !== undefined && parsed >= minMs && parsed <= maxMs;
      },
      {
        message: `must be between ${ms(minMs, { long: true })} and ${ms(maxMs, { long: true })} (RNF-SEG4)`,
      },
    );
}

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Express `trust proxy`, as a hop count. The per-IP throttler keys on
 * `req.ip`; behind a reverse proxy (Dokploy, RNF-INF1) that is the proxy's
 * own address unless this is set, collapsing every client into one shared
 * bucket -- so the limit stops being per-IP and any single attacker can
 * exhaust it for everyone.
 *
 * Deliberately a number and not a boolean: `trust proxy: true` makes the
 * app believe the whole X-Forwarded-For chain, letting a client forge its
 * own address and skip the limit entirely. A hop count only trusts the
 * addresses your own proxies appended.
 */
const trustProxySchema = z.coerce.number().int().min(0).default(0);

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUST_PROXY_HOPS: trustProxySchema,
  DATABASE_URL: z.url(),
  // HS256 (docs/stack.md) rests entirely on the secret's entropy: a short one
  // is brute-forceable offline from any captured token, letting an attacker
  // forge admin credentials. Refuse to boot below 32 characters.
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // upper bound only -- a shorter access token is always safe, a longer one
  // widens the window a stolen token stays usable
  JWT_ACCESS_EXPIRATION: durationSchema(MINUTE_MS, 15 * MINUTE_MS, '"15m"'),
  JWT_REFRESH_EXPIRATION: durationSchema(7 * DAY_MS, 30 * DAY_MS, '"30d"'),
  COOKIE_DOMAIN: z.string().min(1),
  FRONTEND_URL: z.url(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
