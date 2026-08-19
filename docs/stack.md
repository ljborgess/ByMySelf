# Stack tecnológica

[← voltar ao índice](./README.md)

| Camada | Escolha | Alternativas descartadas |
|---|---|---|
| Linguagem | TypeScript (front e back) | — |
| Backend | NestJS | — |
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui | Vite/SPA (perde SSR/SEO) |
| Banco | PostgreSQL puro | Supabase (auth própria já é requisito), MySQL, MongoDB |
| ORM | MikroORM (Data Mapper + Unit of Work) | Prisma (mais reconhecido no mercado, mas menos profundidade técnica pra mostrar), TypeORM (migration instável) |
| Validação | Zod via `nestjs-zod` | `class-validator` (não compartilha schema com o frontend) |
| Documentação de API | Swagger/OpenAPI (`@nestjs/swagger`) | — |
| Testes unitários | Jest, por rota (controller/service, repository mockado) | — |
| Testes de integração | Testcontainers (Postgres real em container) | Mock puro (não pega erro de schema/constraint) |
| Testes e2e | Playwright | Cypress |
| Qualidade estática | SonarCloud (SonarQube Cloud), free tier, repo privado, teto 50k LOC | SonarQube self-hosted (infra extra sem necessidade) |
| Lint/format | ESLint + Prettier | — |
| CI/CD | GitHub Actions | — |
| Deploy | VPS + Docker + Dokploy | Vercel + Railway/Fly.io (perde vitrine de infra própria) |
| Error tracking | Sentry (free tier) | GlitchTip (self-hosted, infra extra sem necessidade) |
| Gerenciador de pacotes | pnpm (workspaces) | — |
| Runtime | Node 22 LTS (fixado via `.nvmrc` + `engines`) | Node 20 LTS (mais madura, mas sem legado a proteger aqui) |
| Assinatura JWT | HMAC/HS256, segredo único por backend | RS256 (só compensa com múltiplos serviços verificando sem assinar — não é o caso) |
| Animação/motion | Framer Motion | GSAP (mais poderoso, licença paga acima de uso livre — fica de reserva pra hero pontual) |
| i18n | `next-intl` (prefixo de URL, `/pt` `/en`) | Sem prefixo/cookie (perde indexação SEO separada por idioma) |
| Analytics | Umami self-hosted (container próprio no VPS) | Plausible (pago), Google Analytics (cookie, reabre discussão de LGPD) |
| Pre-commit | Husky + `lint-staged` | Lint só no CI (perde feedback antes do commit) |

## Restrição transversal: custo

Nenhuma ferramenta de terceiro paga — toda escolha de stack prioriza free tier ou self-hosted no VPS já decidido (RNF-INF1). Vale retroativo: SonarCloud, Sentry, GitHub Actions, Dokploy, Umami — todos grátis por escolha, não por acaso.
