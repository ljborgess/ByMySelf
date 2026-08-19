import { z } from 'zod';

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
  JWT_ACCESS_EXPIRATION: z.string().min(1),
  JWT_REFRESH_EXPIRATION: z.string().min(1),
  COOKIE_DOMAIN: z.string().min(1),
  FRONTEND_URL: z.url(),
  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
