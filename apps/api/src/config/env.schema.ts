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

/**
 * A origem do CORS é comparada por igualdade exata com o header `Origin` do
 * browser, que nunca traz barra final nem caminho. `https://site.com/` passa
 * no `z.url()` e então rejeita **todo** request cross-origin em produção —
 * uma falha que aparece como "o login não funciona" e manda quem investiga
 * para o lado errado.
 *
 * Em produção também exige https: o cookie de auth é `Secure`, então sobre
 * http ele nunca chega, e o RNF-SEG8 fixa TLS obrigatório.
 */
const frontendUrlSchema = z.url().superRefine((value, ctx) => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return;
  }

  // Compara contra `origin` em vez de conferir barra e caminho um a um: o
  // `origin` é exatamente o que o browser manda no header `Origin`, então
  // qualquer coisa que não seja idêntica a ele quebra o match do CORS.
  // Porta default explícita (`:443`), query, fragmento e userinfo passariam
  // por uma checagem só de path, e cada um deles rejeita todo request
  // cross-origin em silêncio.
  if (value !== parsed.origin) {
    ctx.addIssue({
      code: 'custom',
      message: `must be exactly the origin, with nothing else (e.g. ${parsed.origin}) — CORS compares it verbatim against the browser's Origin header`,
    });
  }
});

/**
 * Vai direto no atributo `Domain` do cookie de auth. Ali só cabe um host —
 * com esquema, porta ou caminho o browser descarta o cookie sem erro, e o
 * login responde 200 com a sessão nunca persistindo (user story 4).
 */
const cookieDomainSchema = z
  .string()
  .min(1)
  .refine((value) => !/^[a-z]+:\/\//i.test(value), {
    message: 'must not include a scheme — use the bare host (e.g. site.com)',
  })
  .refine((value) => !value.includes('/') && !value.includes(':'), {
    message: 'must not include a path or port — use the bare host',
  });

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3100),
  TRUST_PROXY_HOPS: trustProxySchema,
  DATABASE_URL: z.url(),
  // Least privilege (#88): DATABASE_URL passa a apontar para uma role sem
  // DDL, então migrations precisam de uma conexão separada com privilégio
  // para CREATE/ALTER TABLE. Opcional porque em dev só existe a role
  // `postgres`: os call sites (migrate.ts, bootstrap-role.ts) caem de volta
  // para DATABASE_URL quando esta não está definida.
  MIGRATION_DATABASE_URL: z.url().optional(),
  // HS256 (docs/stack.md) rests entirely on the secret's entropy: a short one
  // is brute-forceable offline from any captured token, letting an attacker
  // forge admin credentials. Refuse to boot below 32 characters.
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  // upper bound only -- a shorter access token is always safe, a longer one
  // widens the window a stolen token stays usable
  JWT_ACCESS_EXPIRATION: durationSchema(MINUTE_MS, 15 * MINUTE_MS, '"15m"'),
  JWT_REFRESH_EXPIRATION: durationSchema(7 * DAY_MS, 30 * DAY_MS, '"30d"'),
  COOKIE_DOMAIN: cookieDomainSchema,
  FRONTEND_URL: frontendUrlSchema,
  SENTRY_DSN: z.string().optional(),
});

/**
 * Regras que dependem de mais de um campo, ou que só valem em produção.
 *
 * Ficam aqui e não no campo porque precisam enxergar `NODE_ENV` e os dois
 * segredos ao mesmo tempo.
 */
export const envSchemaWithCrossChecks = envSchema.superRefine((env, ctx) => {
  // User story 2. Os dois segredos existirem separados é o que garante que um
  // access token capturado não sirva para forjar um refresh (e vice-versa).
  // Iguais, essa separação vira decorativa — e o schema aceitava, porque cada
  // um passa no `min(32)` sozinho. Copiar e colar é justamente o caminho mais
  // provável de acontecer.
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message:
        'must differ from JWT_ACCESS_SECRET — identical secrets collapse the access/refresh separation (RNF-SEG10)',
    });
  }

  // Tudo daqui para baixo depende de `NODE_ENV` valer 'production', e o campo
  // tem default 'development' — em tese, esquecer a variável desligaria as
  // guardas caladamente. Na prática o caminho de deploy a crava em dois
  // lugares (`ENV NODE_ENV=production` em apps/api/Dockerfile e no serviço do
  // docker-compose.prod.yml), então perder isso exige sobrescrever de
  // propósito, não omitir.
  if (env.NODE_ENV !== 'production') {
    return;
  }

  // RNF-SEG8: o cookie de auth é `Secure`, então sobre http ele simplesmente
  // não chega — o login responderia 200 e a sessão nunca existiria.
  //
  // Case-insensitive: `HTTPS://` é uma URL válida e equivalente, e rejeitá-la
  // com "use https" seria um erro que contradiz o que a pessoa digitou.
  if (!/^https:\/\//i.test(env.FRONTEND_URL)) {
    ctx.addIssue({
      code: 'custom',
      path: ['FRONTEND_URL'],
      message: 'must use https in production (RNF-SEG8)',
    });
  }

  // User story 2: "not the same values used in local development". Não dá
  // para saber o que é dev, mas dá para barrar o que claramente não é
  // produção — o valor do .env.example, e strings de teste óbvias.
  const placeholderPattern =
    /^(change|changeme|placeholder|secret|password|test|dev|development|example|localhost)/i;

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (placeholderPattern.test(env[key])) {
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message:
          'looks like a placeholder or development value — generate a fresh production secret (openssl rand -base64 48)',
      });
    }
  }

  // #88: pega o erro de copiar/colar a mesma URL nas duas variáveis antes
  // mesmo de tocar o banco -- sem isto o sintoma só apareceria na checagem
  // de rolsuper no boot do DatabaseModule, ou pior, passaria despercebido se
  // a role de DATABASE_URL não for de fato superusuário mas ainda assim for
  // a mesma usada para migrar (nenhuma separação de fato).
  if (
    env.MIGRATION_DATABASE_URL !== undefined &&
    env.MIGRATION_DATABASE_URL === env.DATABASE_URL
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['MIGRATION_DATABASE_URL'],
      message:
        'must differ from DATABASE_URL — identical values mean migrations and the app share the same role, defeating least privilege (#88)',
    });
  }

  // Case-insensitive e cobrindo os endereços de loopback: `LOCALHOST` e
  // `127.0.0.1` são o mesmo engano com outra grafia, e ambos escopariam o
  // cookie para um host que não é o do site.
  const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

  if (LOOPBACK_HOSTS.has(env.COOKIE_DOMAIN.toLowerCase())) {
    ctx.addIssue({
      code: 'custom',
      path: ['COOKIE_DOMAIN'],
      message:
        'is still a local development value — set it to the production domain (user story 4)',
    });
  }
});

export type Env = z.infer<typeof envSchema>;
