import ms from 'ms';
import { z } from 'zod';

// AuthService parses this with `ms()` on every login to compute cookie
// Max-Age and RefreshToken.expiresAt. `ms()` returns `undefined` instead of
// throwing on an unparseable string, which would otherwise only surface as a
// 500 on the first login after a typo'd .env -- reject it here instead, so
// an invalid value fails fast at startup (RNF-INF3) like every other env var.
function isValidDuration(value: string): boolean {
  return typeof ms(value as ms.StringValue) === 'number';
}

const durationSchema = z.string().min(1).refine(isValidDuration, {
  message: 'must be a valid duration string (e.g. "15m", "30d")',
});

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  // HS256 (docs/stack.md) rests entirely on the secret's entropy: a short one
  // is brute-forceable offline from any captured token, letting an attacker
  // forge admin credentials. Refuse to boot below 32 characters.
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: durationSchema,
  JWT_REFRESH_EXPIRATION: durationSchema,
  COOKIE_DOMAIN: z.string().min(1),
  FRONTEND_URL: z.url(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
