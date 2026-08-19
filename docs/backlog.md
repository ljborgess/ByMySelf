# Backlog / melhorias futuras

[← voltar ao índice](./README.md)

Itens discutidos e conscientemente adiados — não são "esquecidos", são decisão de escopo:

| Item | Por que ficou de fora agora |
|---|---|
| MFA/TOTP no login | Senha forte + Argon2id + rate limit cobrem o risco atual; adicionar quando o painel crescer em criticidade |
| Upload de imagem (S3/R2) | `coverImageUrl` como string externa resolve a função sem infra de storage extra |
| Formulário de contato | Evita coleta de dado pessoal de terceiro e superfície de spam/injection |
| SonarQube self-hosted | SonarCloud free (até 50k LOC) resolve sem infra extra — revisar se o projeto crescer além do teto |

## Decisões em aberto

Nenhuma — todos os pontos levantados durante o grilling foram fechados em 2026-08-19.
