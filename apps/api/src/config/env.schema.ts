import { z } from 'zod';

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
 * uma falha que aparece como "a página não carrega" e manda quem investiga
 * para o lado errado.
 */
const frontendUrlSchema = z.url().superRefine((value, ctx) => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return;
  }

  if (value !== parsed.origin) {
    ctx.addIssue({
      code: 'custom',
      message: `must be exactly the origin, with nothing else (e.g. ${parsed.origin}) — CORS compares it verbatim against the browser's Origin header`,
    });
  }
});

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3100),
  TRUST_PROXY_HOPS: trustProxySchema,
  FRONTEND_URL: frontendUrlSchema,
  // Fine-grained PAT, "Public Repositories (read-only)" access, no extra
  // permissions -- docs/decisao-projetos-github-pins.md. Only public repo
  // metadata (pinned repos, description, languages, openGraphImageUrl) is
  // ever read, but the GitHub GraphQL API requires *some* authenticated
  // token even for public data.
  GITHUB_TOKEN: z.string().min(1),
  GITHUB_USERNAME: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
