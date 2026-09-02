# ByMySelf

Portfólio pessoal — monorepo com API e site público, construído em NestJS + Next.js.

## Estrutura

```
apps/api        NestJS — proxy fino para os pinned repos do GitHub (GraphQL)
apps/web        Next.js — site público
packages/shared Tipos compartilhados entre API e site
```

## Stack

TypeScript · NestJS · Next.js (App Router) · Zod · Jest · pnpm workspaces · Docker

## Rodando localmente

Requer Node 22 (fixado em `.nvmrc`) e pnpm.

```bash
pnpm install
cp .env.example .env               # preencha GITHUB_TOKEN, ver abaixo
pnpm --filter api start:dev        # API na 3100
pnpm --filter web dev              # site na 3101
```

Portas escolhidas fora dos defaults de propósito — API em **3100**, site em **3101**. As portas óbvias (3000) são as que todo projeto local disputa, e uma delas ocupada por outro projeto é o suficiente para impedir este de subir. Ajustáveis por `PORT` e o script `dev` do `apps/web`.

### Variáveis de ambiente

Todas validadas no startup — a aplicação recusa subir com configuração inválida, em vez de falhar na primeira requisição. Ver `.env.example` para a lista completa.

Os pontos que costumam morder:

- **`GITHUB_TOKEN`** — fine-grained Personal Access Token com "Public Repositories (read-only)" e nenhuma permissão extra. Sem ele a API não sobe. Passo a passo em [`docs/decisao-projetos-github-pins.md`](docs/decisao-projetos-github-pins.md).
- **`TRUST_PROXY_HOPS`** — quantos proxies reversos ficam na frente da API. `0` em dev (conexão direta), `1` em produção atrás do Dokploy. O rate limit usa `req.ip`; atrás de um proxy sem esse ajuste todo mundo cai num balde compartilhado e o limite deixa de ser por IP. É contagem de hops e não booleano de propósito: `trust proxy: true` deixaria qualquer cliente forjar o próprio `X-Forwarded-For`.

## `/projetos`

Não tem CRUD nem admin: a página mostra os repositórios que você fixou (pin)
no seu perfil do GitHub, buscados via GraphQL e cacheados por 1h na API. Para
mudar o que aparece, edite os pins direto no GitHub.

## Deploy

As duas apps têm Dockerfile multi-stage, buildado **a partir da raiz do
repositório** (é um workspace pnpm — o build precisa do lockfile da raiz e de
`packages/shared`):

```bash
docker build -f apps/api/Dockerfile -t bymyself-api .
docker build -f apps/web/Dockerfile --build-arg FRONTEND_URL=https://seu-dominio.com -t bymyself-web .
```

`FRONTEND_URL` é build-arg no web porque as páginas são pré-renderizadas e o
Next grava as URLs de metadata durante o build. Configuração completa das
aplicações no Dokploy em [`deploy/dokploy.md`](deploy/dokploy.md).

## Qualidade

```bash
pnpm lint
pnpm format:check
pnpm -r type-check
pnpm --filter api test:cov     # cobertura mínima de 80%, falha abaixo disso
pnpm --filter api test:e2e
```

O CI roda tudo isso a cada pull request para `main` e `dev`. Lint, format e Prettier também rodam em pre-commit via Husky, só nos arquivos staged.
