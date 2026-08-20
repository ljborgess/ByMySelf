# ByMySelf

Portfólio pessoal — monorepo com painel administrativo autenticado (JWT) e site público, construído em NestJS + Next.js.

## Estrutura

```
apps/api        NestJS — API, autenticação, CLI administrativo
apps/web        Next.js — site público e painel
packages/shared Zod schemas e tipos compartilhados
```

## Stack

TypeScript · NestJS · Next.js (App Router) · PostgreSQL · Drizzle ORM · Zod · Jest · pnpm workspaces · Docker

## Rodando localmente

Requer Node 22 (fixado em `.nvmrc`) e pnpm.

```bash
pnpm install
docker compose up -d postgres      # Postgres local na 5434
cp .env.example .env               # preencha os segredos, ver abaixo
pnpm --filter api db:migrate       # aplica as migrations
pnpm --filter api start:dev        # API na 3100
pnpm --filter web dev              # site na 3101
```

Portas escolhidas fora dos defaults de propósito — API em **3100**, site em **3101**, Postgres em **5434**. As portas óbvias (3000, 5432) são as que todo projeto local disputa, e uma delas ocupada por outro projeto é o suficiente para impedir este de subir. Ficar fora delas significa não precisar derrubar o banco ou o servidor de mais ninguém para trabalhar aqui. Todas ajustáveis por `PORT`, `POSTGRES_PORT` e o script `dev` do `apps/web`.

### Variáveis de ambiente

Todas validadas no startup — a aplicação recusa subir com configuração inválida, em vez de falhar na primeira requisição. Ver `.env.example` para a lista completa.

Os pontos que costumam morder:

- **`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`** — mínimo de 32 caracteres cada, e independentes entre si. HS256 depende inteiramente da entropia do segredo. Gere com `openssl rand -base64 48`.
- **`JWT_ACCESS_EXPIRATION` / `JWT_REFRESH_EXPIRATION`** — access até 15 min, refresh entre 7 e 30 dias. Um `15d` no access, erro de digitação plausível, é recusado no boot em vez de emitir credencial de duas semanas.
- **`TRUST_PROXY_HOPS`** — quantos proxies reversos ficam na frente da API. `0` em dev (conexão direta), `1` em produção atrás do Dokploy. O rate limit do login usa `req.ip`; atrás de um proxy sem esse ajuste todo mundo cai num balde compartilhado e o limite deixa de ser por IP. É contagem de hops e não booleano de propósito: `trust proxy: true` deixaria qualquer cliente forjar o próprio `X-Forwarded-For`.

### Criando a conta admin

Não existe endpoint de cadastro — decisão deliberada, só existe uma conta. De dentro de `apps/api`:

```bash
pnpm cli create-admin
pnpm cli create-admin --email=voce@exemplo.com
```

A senha é sempre pedida interativamente e mascarada, nunca aceita como argumento — iria parar no histórico do shell e na listagem de processos. Rodar de novo com conta existente atualiza a linha em vez de duplicar: é também o mecanismo de recuperação de acesso, já que não há fluxo de "esqueci minha senha".

## Consumindo a API

- **Toda mutação exige um header.** `POST`/`PUT`/`PATCH`/`DELETE` sem `X-Requested-With: XMLHttpRequest` recebem `403`, inclusive `/auth/login`. É a mitigação de CSRF somada ao `SameSite=Strict` dos cookies.
- **Tokens só em cookie.** Login e refresh respondem `{ "status": "ok" }` — os tokens vão em cookie `HttpOnly`, inacessíveis a JavaScript. Chamadas cross-origin precisam de `credentials: 'include'`.
- **`401` em `/auth/refresh` significa reautenticar**, não repetir. O refresh token foi rotacionado, expirou, ou a família inteira foi revogada por reuso detectado.

Documentação OpenAPI em `/docs` fora de produção.

## Qualidade

```bash
pnpm lint
pnpm format:check
pnpm -r type-check
pnpm --filter api test:cov     # cobertura mínima de 80%, falha abaixo disso
pnpm --filter api test:e2e
```

O CI roda tudo isso a cada pull request para `main` e `dev`. Lint, format e Prettier também rodam em pre-commit via Husky, só nos arquivos staged.
