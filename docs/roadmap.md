# Roteiro de implementação

[← voltar ao índice](./README.md)

Fases, não cortes — nada sai do escopo formal (RF/RNF), só muda a ordem de entrega. Motivo: evitar o risco real deste projeto, que não é técnico, é terminar. Fase 1 sozinha já prova auth robusta, CRUD, deploy e teste — o suficiente pra ter link pronto pra mandar. Fase 2 é rigor que só quem lê o repositório/CI percebe. Fase 3 é o que mais cresce em tempo (i18n principalmente) sem mudar se o site já está no ar e funcionando.

## Fase 1 — vai ao ar

- Auth completo: login/refresh/logout/rotation, Argon2id, rate limit, bootstrap via CLI (`RF-AUT1-5`)
- CRUD de projeto (admin) + soft delete + reorder (`RF-PROJ1-6`)
- **Estrutura de i18n nasce aqui, conteúdo não.** Rota já sob prefixo `/pt` (`next-intl` configurado, só locale `pt` ativo/linkado), `Project.title`/`description`/`content` já `jsonb { pt, en }` desde a primeira migration (`en` fica vazio). Evita migration de schema e redirect de URL depois que o site já estiver indexado.
- Site público PT-BR: home, sobre, formação, certificados, projetos, projeto/slug — layout Tailwind/shadcn responsivo (`RNF-USA1`), sem animação elaborada ainda
- CV download (`RF-PUB7`)
- Health check (`RNF-INF6`), deploy Dokploy/VPS/Docker/HTTPS/secrets (`RNF-INF1`, `RNF-SEG8`, `RNF-SEG10`)
- Segurança de base: Helmet, CORS, validação Zod em toda borda (`RNF-SEG6`, `RNF-SEG7`, `RNF-SEG9`)
- Teste unitário por rota (`RNF-QUA1`), lint/format + pre-commit (`RNF-QUA6`)

## Fase 2 — endurece

- Backup Postgres: `pg_dump` → Backblaze B2, retenção 7 dias, restore testado por trimestre (`RNF-INF7`)
- Sentry error tracking (`RNF-INF5`)
- Testes de integração via Testcontainers (`RNF-QUA2`) e e2e via Playwright (`RNF-QUA3`)
- SonarCloud + Quality Gate bloqueante (`RNF-QUA4`, `RNF-QUA5`)
- Rate limit nas rotas públicas de leitura (`RNF-SEG12`)

## Fase 3 — polimento

- Framer Motion / hero estilo Apple — aditivo sobre o layout da Fase 1, não reescreve estrutura
- Dark mode (`RNF-USA2`)
- Analytics via Umami self-hosted (`RNF-INF8`)
- Conteúdo EN: traduzir `profile.pt.ts`/`.en.ts`, preencher `jsonb.en` de cada projeto, ativar rota `/en` e seletor de idioma visível — estrutura já existe desde a Fase 1, aqui só entra o conteúdo (`RNF-I18N1-2`, `RF-PUB8`)
- MFA/TOTP (ver [backlog.md](./backlog.md))
