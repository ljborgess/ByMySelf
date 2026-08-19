# ByMySelf

Portfólio pessoal — monorepo com painel administrativo autenticado (JWT) e site público, construído em NestJS + Next.js.

Especificação completa em [`docs/`](./docs/README.md): visão geral, escopo, stack, arquitetura, modelo de domínio, requisitos funcionais/não-funcionais, roadmap de fases e ambiente de desenvolvimento.

## Estrutura

```
apps/api        NestJS
apps/web        Next.js
packages/shared Zod schemas e tipos compartilhados
docs/           especificação do projeto
```

## Desenvolvimento

Ver [`docs/ambiente-dev.md`](./docs/ambiente-dev.md) para `docker-compose` e variáveis de ambiente.
