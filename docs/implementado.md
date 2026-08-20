# O que já está implementado

[← voltar ao índice](./README.md)

> Registro do que **existe no código**, não do que foi planejado — os outros documentos descrevem intenção, este descreve estado. Última atualização: 2026-08-20.

## Status por épico

| Épico | Estado | Entregue em |
|---|---|---|
| #1 Scaffold & Tooling | ✅ concluído | PRs #40–#44, #47 |
| #2 Autenticação & Segurança | ✅ concluído | PRs #49–#56 |
| #3 Gestão de Projeto (Admin CRUD) | ⬜ não iniciado | — |
| #4 Site Público | ⬜ não iniciado | — |
| #5 Deploy & Infraestrutura | ⬜ não iniciado | — |
| #6 Painel Admin (Frontend UI) | ⬜ não iniciado | — |

Backend de autenticação completo. `apps/web` ainda é o esqueleto do `create-next-app` — nenhuma tela existe.

## Estrutura entregue

```
apps/api/src/
  auth/          login/refresh/logout, guard, rate limit, hashing
  cli/           comando create-admin
  common/        CsrfGuard global
  config/        validação de env via Zod (fail fast)
  database/      conexão Drizzle, migrations
  health/        GET /health
  users/         schema da tabela users
  swagger.ts     OpenAPI, desabilitado em produção
```

Migrations aplicadas: `0000_baseline.sql` (vazia), `0001_little_hairball.sql` (`users` + `refresh_tokens`).

## Rotas existentes

| Rota | Auth | Rate limit | CSRF |
|---|---|---|---|
| `POST /auth/login` | pública | por IP + por conta | sim |
| `POST /auth/refresh` | cookie de refresh | por IP + por conta | sim |
| `POST /auth/logout` | pública (no-op sem cookie) | não | sim |
| `GET /health` | pública | não | não (não é mutação) |
| `GET /docs` | pública fora de produção | não | não |

Ainda não existe rota sob `/admin` — o guard que as protege já está no lugar, esperando.

## Contratos que o frontend precisa respeitar

Definidos aqui porque o épico Painel Admin vai consumi-los antes de existir tela para testá-los:

1. **Header obrigatório em toda mutação.** `POST`/`PUT`/`PATCH`/`DELETE` sem `X-Requested-With: XMLHttpRequest` recebem `403`, inclusive `/auth/login`. Ver [ambiente-dev.md](./ambiente-dev.md).
2. **Cookies, não corpo de resposta.** Login e refresh respondem `{ "status": "ok" }` — os tokens vão só em cookie `HttpOnly`, inacessíveis a JavaScript. O cliente nunca lê o token, só faz a requisição com credenciais.
3. **`credentials: 'include'` obrigatório** em toda chamada cross-origin, senão o navegador não envia os cookies.
4. **`401` em `/auth/refresh` significa reautenticar.** Não existe retry — o refresh token foi rotacionado, expirou ou a família inteira foi revogada por reuse.

## Decisões que divergiram da especificação original

**Drizzle ORM no lugar de MikroORM.** MikroORM v7 é ESM puro e quebra o runner Jest CJS do NestJS; v6 não instalava de forma confiável no ambiente Windows. Registrado em [stack.md](./stack.md); `RNF-INF2` e [arquitetura.md](./arquitetura.md) foram atualizados para refletir.

**Refresh token é JWT assinado, não string opaca.** `JWT_REFRESH_SECRET` já existia no schema de env desde o scaffold e `RNF-SEG10` pede segredos independentes por token — usar uma string aleatória opaca deixaria esse segredo morto no código. O token carrega `sub` + `familyId` e é assinado com o segredo próprio; o banco guarda apenas o `sha256` dele.

**Backoff por conta é in-memory.** Suficiente para o deploy single-instance no VPS. Um store compartilhado (Redis) só passa a ser necessário com múltiplas instâncias, que este projeto não tem.

## Achados de review e o que mudou por causa deles

Cada épico passou por code review + security review antes de fechar. O que foi encontrado, porque tende a se repetir:

### Épico #1 (PR #47)

- CI não rodava os testes — 14 specs escritas no épico não barravam nada.
- Config do Jest unitário sem `setupFiles`: qualquer spec que importasse `config/env.ts` matava o worker via `process.exit(1)`, sem output.
- Helper `scoped()` do ESLint quebrava os ignores globais — `apps/web/out` estava sendo lintado.
- `packages/shared` apontava `main` para o `.ts` cru; só funcionava por acidente do Node 24.

### Épico #2 (PR #56)

- **Bypass de autenticação em toda rota `/admin`.** Express roteia case-insensitive por padrão; o guard comparava case-sensitive. `/ADMIN/projects` entregava o handler, `/admin/projects` devolvia `401`. Nada exposto porque nenhuma rota `/admin` existia — entraria vivo com a primeira delas. O teste de regressão agora exercita roteamento Express real: contexto fabricado não pega divergência entre guard e router, que é a classe inteira do bug.
- **Rate limit "por IP" era balde único em produção.** Sem `trust proxy`, `req.ip` é o endereço do proxy reverso. O limite deixava de ser por IP e um atacante sozinho trancava o dono com 10 requisições. Corrigido via `TRUST_PROXY_HOPS` — contagem de hops, nunca booleano: `trust proxy: true` deixaria qualquer cliente forjar o próprio `X-Forwarded-For`.
- Backoff por conta crescia sem limite (chaveado por email submetido, sem eviction) — agora TTL de 1h.
- `RNF-SEG4` não era validado: `JWT_ACCESS_EXPIRATION=15d` subia emitindo credencial de duas semanas.
- `refresh_tokens` nunca encolhia — rotation agora poda as linhas expiradas da conta na mesma transaction.
- Race de rotation permitia dois pares válidos do mesmo token — revoke agora é atômico (`UPDATE ... WHERE revokedAt IS NULL RETURNING`) dentro de transaction com o insert.

## Qualidade

- **87 testes unitários**, cobertura **96,86% statements / 83,78% branches**.
- Threshold de 80% travado no Jest e rodando no CI via `test:cov` — abaixo disso o build falha.
- Wiring puro de DI (módulos, `main.ts`, declarações de schema Drizzle) fica **fora** da medição, em vez de inflar o número com teste que não afirma nada.
- CI roda lint, format, type-check, testes com cobertura e e2e a cada PR para `main` e `dev`.

## Pendências rastreadas

| Item | Onde | Bloqueio |
|---|---|---|
| SonarCloud no CI (`RNF-QUA4`/`RNF-QUA5`) | Fase 2 | precisa de `SONAR_TOKEN` e setup do projeto |
| Branch protection tornando o CI bloqueante | issue #46 | — |
| Rate limit em rotas públicas de leitura (`RNF-SEG12`) | Fase 2 | depende das rotas do épico #4 |
| Testcontainers (`RNF-QUA2`) e Playwright (`RNF-QUA3`) | Fase 2 | — |
| Logging estruturado (`RNF-INF4`), Sentry (`RNF-INF5`) | Fase 2 | — |

O CI **roda** mas ainda não **bloqueia** merge — até a issue #46 entrar, o gate de cobertura pode ser ignorado por quem tiver permissão de merge.

## Verificações feitas manualmente

Não cobertas por teste automatizado, refeitas a cada mudança relevante:

- Migration aplicada contra o Postgres do `docker-compose`, conferindo tabelas, FK e índices.
- Headers do Helmet presentes em toda resposta; `/docs` acessível em dev e `404` em produção.
- Cookies chegando com `HttpOnly; Secure; SameSite=Strict` no fio.
- CORS refletindo apenas `FRONTEND_URL` e recusando outras origens.
- Fail-fast do env recusando bootar com segredo curto, duração fora dos limites e `TRUST_PROXY_HOPS=true`.
- Fluxo do `create-admin`: `--email` pula o prompt, senha é mascarada caractere a caractere.
