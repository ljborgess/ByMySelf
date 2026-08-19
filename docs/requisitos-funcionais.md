# Requisitos funcionais (RF)

[← voltar ao índice](./README.md)

## Autenticação

- **RF-AUT1** — Login com email + senha, retorna access token (cookie httpOnly) e refresh token (cookie httpOnly).
- **RF-AUT2** — Endpoint de refresh: troca refresh token válido por novo par access/refresh (rotation). Detecta reuse de refresh já trocado e revoga toda a família de tokens.
- **RF-AUT3** — Logout: revoga o refresh token atual (marca `revokedAt`), limpa os cookies.
- **RF-AUT4** — Toda rota do painel admin (`/admin/*`) exige access token válido — middleware/guard de autenticação.
- **RF-AUT5** — Bootstrap/recuperação da conta admin via comando `pnpm cli create-admin` (sem endpoint de cadastro público).

## Projetos (painel admin — autenticado)

- **RF-PROJ1** — Criar projeto. `title`/`description`/`content` em PT-BR obrigatórios na criação; EN opcional, pode ficar vazio.
- **RF-PROJ2** — Editar projeto, incluindo preencher tradução EN pendente a qualquer momento.
- **RF-PROJ3** — Remover projeto via soft delete (`deletedAt`) — recuperável, some do site público e do painel por padrão via filtro global do MikroORM.
- **RF-PROJ4** — Listar projetos no painel (todos os status, incluindo `archived`).
- **RF-PROJ5** — Reordenar projetos (atualiza campo `order`).
- **RF-PROJ6** — Card/página em EN faz fallback pro conteúdo PT quando a tradução ainda não existe — nunca exibe vazio ou quebra a navegação.

## Site público

- **RF-PUB1** — Listar projetos com `status != archived`, ordenados por `order`, destacando os `featured`.
- **RF-PUB2** — Página de detalhe de um projeto via `slug`.
- **RF-PUB3** — Nenhuma rota pública expõe dado de autenticação ou endpoint administrativo.
- **RF-PUB4** — Página "Sobre": bio, objetivo, foto, habilidades e idiomas (conteúdo estático de `profile.ts`).
- **RF-PUB5** — Página "Formação": lista de formação acadêmica com tecnologias associadas.
- **RF-PUB6** — Página "Certificados": lista de certificados com link de validação.
- **RF-PUB7** — Botão "Baixar CV" na página Sobre, aponta pro PDF estático (`apps/web/public/cv-pt.pdf` / `cv-en.pdf`).
- **RF-PUB8** — Toda página pública disponível em PT-BR (`/pt/...`, default) e EN (`/en/...`), com seletor de idioma visível.
