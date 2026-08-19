# Requisitos não funcionais (RNF)

[← voltar ao índice](./README.md)

## Segurança

- **RNF-SEG1** — Senha armazenada com Argon2id, nunca em texto plano ou reversível.
- **RNF-SEG2** — JWT em cookie `HttpOnly; Secure; SameSite=Strict`. Nenhum token acessível via JavaScript no cliente.
- **RNF-SEG3** — Mitigação CSRF: `SameSite=Strict` + header customizado obrigatório em requisições de mutação (`POST`/`PUT`/`PATCH`/`DELETE`).
- **RNF-SEG4** — Access token expira em 15 minutos. Refresh token expira em 7–30 dias, com rotation a cada uso.
- **RNF-SEG5** — Rate limiting no login: por IP e por conta, com backoff progressivo. Sem lockout definitivo (mitiga self-DoS, já que existe uma única conta).
- **RNF-SEG6** — Headers de segurança via Helmet (CSP, HSTS, X-Frame-Options, etc).
- **RNF-SEG7** — CORS restrito à origem do frontend (`apps/web`), sem wildcard.
- **RNF-SEG8** — HTTPS obrigatório em produção (TLS via Dokploy/Let's Encrypt).
- **RNF-SEG9** — Validação de toda entrada (body, query, params) via schema Zod na borda — nenhum dado não-validado chega ao service.
- **RNF-SEG10** — Segredos (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, etc) fora do repositório, injetados via variável de ambiente / secret do Dokploy. Segredo de access e refresh token são independentes — vazamento de um não compromete o outro.
- **RNF-SEG11** — Swagger/OpenAPI desabilitado ou protegido por autenticação em produção.
- **RNF-SEG12** — Rate limit também nas rotas públicas de leitura (`GET /projects`, `/projects/:slug`), limite mais folgado que o do login — mitiga scraping/bot sem exigir autenticação.

## Qualidade e testes

- **RNF-QUA1** — Cobertura de teste unitário para toda rota (controller/service), com repository mockado.
- **RNF-QUA2** — Testes de integração contra Postgres real via Testcontainers, cobrindo constraint e comportamento de query.
- **RNF-QUA3** — Testes e2e via Playwright cobrindo os fluxos completos: login, CRUD de projeto, listagem/detalhe pública.
- **RNF-QUA4** — SonarCloud Quality Gate: sem vulnerabilidade nova, duplicação sob limite definido, cobertura mínima de **80%**.
- **RNF-QUA5** — Pipeline de CI (lint + type-check + todos os testes + Sonar) **bloqueia merge** se qualquer etapa falhar (branch protection no GitHub).
- **RNF-QUA6** — Prettier + ESLint aplicados via pre-commit hook (Husky + `lint-staged`, só nos arquivos staged) e reforçados no CI.

## Infraestrutura e operação

- **RNF-INF1** — Deploy containerizado (Docker) via Dokploy em VPS próprio.
- **RNF-INF2** — Migration de schema via MikroORM, seguindo padrão expand-contract para mudança sem downtime.
- **RNF-INF3** — Variáveis de ambiente validadas no startup (fail fast) — aplicação não sobe com config inválida/faltante.
- **RNF-INF4** — Logging estruturado (JSON), sem dado sensível (senha, token) em log algum.
- **RNF-INF5** — Erros não tratados em produção capturados via Sentry (free tier), com contexto de request.
- **RNF-INF6** — `GET /health` expõe status da aplicação e da conexão com o Postgres, sem autenticação — usado pelo Dokploy pra decidir se o container está apto a receber tráfego.
- **RNF-INF7** — Backup do Postgres em produção: `pg_dump` diário via cron, enviado para Backblaze B2 (free tier), retenção de 7 dias. Restore testado a cada trimestre — backup não verificado não conta como backup.
- **RNF-INF8** — Analytics de visita via Umami self-hosted, container próprio no VPS.

## Usabilidade

- **RNF-USA1** — Layout mobile-first, funcional a partir de 375px de largura — critério de aceite de cada página pública.
- **RNF-USA2** — Suporte a tema claro/escuro via Tailwind/shadcn (`class` strategy), respeitando preferência do sistema operacional por padrão.

## Internacionalização

- **RNF-I18N1** — Site público em PT-BR (default) e EN via `next-intl`, roteamento por prefixo de URL (`/pt`, `/en`).
- **RNF-I18N2** — `sitemap.xml` cobre as duas árvores de idioma; `robots.txt` libera indexação pública e bloqueia `/admin`.

## SEO

- **RNF-SEO1** — Meta tag (`title`, `description`) e Open Graph (`og:title`, `og:image`) por página e por locale.
- **RNF-SEO2** — Server-side rendering (já coberto pela escolha de Next.js) garantindo conteúdo indexável sem JavaScript.

## Privacidade

- **RNF-LGP1** — Sistema não coleta dado pessoal de visitante (sem formulário, sem cadastro público). Superfície de LGPD reduzida ao mínimo: apenas o dado do próprio admin (email, senha hash). Analytics (Umami) não coleta dado pessoal identificável — sem cookie, sem necessidade de banner de consentimento.
