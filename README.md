# ByMySelf

Portfólio pessoal — Next.js, deploy na Vercel.

## Estrutura

```
apps/web        Next.js — site público, inclusive a busca dos pinned repos do GitHub
```

Monorepo pnpm por convenção (ver `pnpm-workspace.yaml`), embora hoje `apps/web`
seja o único pacote — sem API separada nem banco de dados.

## Stack

TypeScript · Next.js (App Router) · Tailwind · GSAP · Jest · pnpm

## Rodando localmente

Requer Node 22 (fixado em `.nvmrc`) e pnpm.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # preencha GITHUB_TOKEN, ver abaixo
pnpm --filter web dev                          # site na 3101
```

## Variáveis de ambiente

Ver `apps/web/.env.example` para a lista completa. O ponto que costuma morder:

- **`GITHUB_TOKEN`** — fine-grained Personal Access Token com "Public Repositories (read-only)" e nenhuma permissão extra. Sem ele `/projetos` e a home falham ao carregar. Passo a passo em [`docs/decisao-projetos-github-pins.md`](docs/decisao-projetos-github-pins.md).

## `/projetos`

Não tem CRUD nem admin: a página mostra os repositórios que você fixou (pin)
no seu perfil do GitHub, buscados via GraphQL e cacheados por 1h (`fetch` com
`next.revalidate`, não um cache próprio — ver `apps/web/lib/projects.ts`). Para
mudar o que aparece, edite os pins direto no GitHub.

## Deploy

Vercel, deploy automático a cada push em `main` (ver
[`docs/decisao-deploy-vercel.md`](docs/decisao-deploy-vercel.md)). Sem
Dockerfile, sem CI de release: a integração da Vercel com o GitHub builda e
publica sozinha.

Configuração do projeto na Vercel:

- **Root Directory**: `apps/web`
- **Environment Variables**: `FRONTEND_URL`, `GITHUB_TOKEN`, `GITHUB_USERNAME` (mesmas de `apps/web/.env.example`, com o domínio real da Vercel em `FRONTEND_URL`)

## Qualidade

```bash
pnpm lint
pnpm format:check
pnpm -r type-check
pnpm --filter web test
pnpm --filter web build
```

O CI (`.github/workflows/ci.yml`) roda tudo isso a cada pull request para
`main` e `dev` — puro gate de qualidade, sem passo de deploy. Lint, format e
Prettier também rodam em pre-commit via Husky, só nos arquivos staged.
