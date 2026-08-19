# Pipeline de CI/CD (GitHub Actions)

[← voltar ao índice](./README.md)

Etapas por PR, todas bloqueantes:

1. Install (cache de dependência via pnpm)
2. Lint (ESLint) + format check (Prettier)
3. Type-check (`tsc --noEmit`)
4. Testes unitários (Jest)
5. Testes de integração (Testcontainers — sobe Postgres efêmero)
6. Testes e2e (Playwright)
7. Análise SonarCloud + Quality Gate
8. Build (Docker image de `api` e `web`)
9. *(main apenas)* Deploy via Dokploy
