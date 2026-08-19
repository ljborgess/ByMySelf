# Arquitetura

[← voltar ao índice](./README.md)

## Monorepo

pnpm workspaces:

```
portfolio/
├── apps/
│   ├── api/          # NestJS
│   └── web/           # Next.js
├── packages/
│   └── shared/         # schemas Zod, tipos compartilhados entre api e web
├── .github/workflows/
└── docker-compose.yml
```

**Por que monorepo:** compartilhar schema Zod e tipos entre `api` e `web` sem duplicação, um único clone para quem avaliar o projeto, CI mais simples de manter sozinho.

## Camadas do backend

Segue convenção controller → service → repository:
- `Controller`: recebe request, valida via Zod (`nestjs-zod`), delega pro service. Não tem lógica de negócio.
- `Service`: lógica de negócio, orquestra repository.
- `Repository` (MikroORM `EntityRepository`): acesso a dado, sem lógica de negócio.

## Estrutura de `apps/api/src`

```
src/
  auth/           controller, service, guard, decorators
  users/          entity (linha única, o admin)
  projects/       entity, repository, service,
                  admin-projects.controller.ts, public-projects.controller.ts
  common/         filters, interceptors, guards compartilhados
  config/         validação de env via Zod (fail fast no startup)
  cli/            comando `create-admin` (bootstrap e recuperação de acesso)
  main.ts
```

## Contrato de rotas

```
Auth (público, rate-limited)
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

Admin — protegido por guard JWT
GET    /admin/projects
POST   /admin/projects
GET    /admin/projects/:id
PATCH  /admin/projects/:id
PATCH  /admin/projects/:id/order    (RF-PROJ5)
DELETE /admin/projects/:id           (soft delete)

Público — sem auth
GET    /projects
GET    /projects/:slug

Operação — sem auth, sem rate limit
GET    /health
```

Sem versionamento de rota (`/v1`) — API tem um único consumidor (o próprio `apps/web`, mesmo monorepo, deployado junto), não existe cliente externo a proteger de breaking change. Sem paginação na listagem — volume de projeto de portfólio pessoal não justifica.

## Bootstrap do admin

Sem endpoint de cadastro (decisão deliberada — só existe uma conta). A conta nasce e se recupera via `pnpm cli create-admin`, comando standalone que lê email/senha (prompt interativo ou flag), gera hash Argon2id, insere/atualiza a linha em `User`. É também o mecanismo de recuperação de acesso, já que não existe fluxo de "esqueci minha senha".

## IA do site (`apps/web`)

Páginas separadas, não single-page com âncora — cada rota indexa individualmente (SEO) e pode ser compartilhada direto. Toda rota leva prefixo de locale (`next-intl`), PT-BR como default:

```
/pt                       home / hub — cards levando pra cada seção      /en
/pt/sobre                 bio, objetivo, habilidades, idiomas, botão de CV /en/about
/pt/formacao              lista de formação acadêmica                    /en/education
/pt/certificados           lista de certificados                          /en/certificates
/pt/projetos              listagem pública de projeto                    /en/projects
/pt/projetos/[slug]        detalhe de um projeto (mesmo slug nos 2 idiomas) /en/projects/[slug]
```

SEO técnico por página: `<title>`/meta description por locale, Open Graph (`og:image`, `og:title`), `sitemap.xml` cobrindo as duas árvores de idioma, `robots.txt` liberando indexação (exceto `/admin`).
