# Portfólio Pessoal — Especificação Técnica

> Documento vivo. Gerado via sessão de grilling em 2026-08-19. Toda decisão registrada tem justificativa — se for revisitar, leia o porquê antes de mudar.

## Visão geral

Portfólio pessoal para centralizar projetos, com painel administrativo protegido por autenticação própria (JWT). O login **não é para visitantes** — serve exclusivamente para o dono gerenciar o conteúdo (CRUD de projetos) e, deliberadamente, como vitrine técnica de autenticação/segurança para quem avaliar o repositório (recrutador, cliente).

Site público: somente leitura, sem cadastro, sem coleta de dado pessoal de terceiro.

## Escopo

### Dentro do escopo
- Painel admin (autenticado) para CRUD de projetos.
- Site público (Next.js) com páginas separadas — home/hub, Sobre, Formação, Certificados, Projetos e detalhe de projeto — em direção visual "produto" (hero por seção, transição suave, inspirado em apple.com).
- Autenticação JWT completa: login, refresh, logout, hashing de senha, rate limiting.
- Pipeline de qualidade: lint, testes (unitário, integração, e2e), análise estática, quality gate bloqueante.
- Deploy containerizado em VPS próprio.

### Fora do escopo (decisão explícita)
- Cadastro/login de visitante.
- Formulário de contato (coleta de dado pessoal de terceiro).
- Upload de arquivo/imagem — capa do projeto é URL externa.
- MFA/2FA — backlog, ver [backlog.md](./backlog.md).
- Multi-tenancy — sistema é mono-usuário.

## Índice

| Documento | Conteúdo |
|---|---|
| [roadmap.md](./roadmap.md) | Ordem de implementação — Fase 1 (vai ao ar) → Fase 2 (endurece) → Fase 3 (polimento) |
| [stack.md](./stack.md) | Stack tecnológica e alternativas descartadas |
| [arquitetura.md](./arquitetura.md) | Monorepo, camadas, estrutura de pastas, contrato de rotas, IA do site |
| [dominio.md](./dominio.md) | Entidades (`User`, `RefreshToken`, `Project`) e conteúdo institucional estático |
| [requisitos-funcionais.md](./requisitos-funcionais.md) | RF — autenticação, projetos, site público |
| [requisitos-nao-funcionais.md](./requisitos-nao-funcionais.md) | RNF — segurança, qualidade, infraestrutura, privacidade |
| [ci-cd.md](./ci-cd.md) | Pipeline GitHub Actions |
| [ambiente-dev.md](./ambiente-dev.md) | `docker-compose.yml` local e `.env.example` |
| [backlog.md](./backlog.md) | Itens adiados conscientemente e decisões em aberto |
