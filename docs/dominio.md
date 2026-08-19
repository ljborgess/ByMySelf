# Modelo de domínio

[← voltar ao índice](./README.md)

## Entidade `User` (admin — linha única na tabela)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK |
| `email` | string | único |
| `passwordHash` | string | Argon2id |
| `createdAt` / `updatedAt` | timestamp | |

## Entidade `RefreshToken`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID | FK → `User` |
| `tokenHash` | string | hash do refresh token, nunca guarda o token em claro |
| `familyId` | UUID | agrupa a cadeia de rotation, permite revogar a família inteira em caso de reuse |
| `revokedAt` | timestamp nullable | |
| `expiresAt` | timestamp | |
| `createdAt` | timestamp | |

## Entidade `Project`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK |
| `title` | jsonb `{ pt, en }` | bilíngue |
| `slug` | string | único, URL amigável — compartilhado entre os dois idiomas |
| `description` | jsonb `{ pt, en }` | curta, para card de listagem |
| `content` | jsonb `{ pt, en }` | markdown, página de detalhe |
| `techStack` | string[] | tecnologias utilizadas — não traduz (nome próprio) |
| `repoUrl` | string, opcional | |
| `demoUrl` | string, opcional | |
| `coverImageUrl` | string, opcional | URL externa, sem upload |
| `status` | enum: `in_progress` \| `completed` \| `archived` | |
| `featured` | boolean | destaque na home |
| `order` | integer | ordenação manual |
| `completedAt` | date, opcional | preenchido quando `status = completed` |
| `deletedAt` | timestamp, opcional | soft delete — filtro global do MikroORM exclui automaticamente das queries padrão |
| `createdAt` / `updatedAt` | timestamp | |

## Conteúdo institucional (estático — sem entidade de banco)

"Sobre mim", formação e certificados mudam pouquíssimas vezes por ano — não compensam entidade + CRUD + teste. Ficam como conteúdo versionado em `apps/web/content/profile.ts`, editado direto no código e publicado via deploy normal, sem rota de API:

```ts
export const profile = {
  name: string,
  headline: string,                  // ex: "Desenvolvedor Backend Node.js/NestJS"
  bio: string,
  objective: string,
  photoUrl: string,                  // URL externa, sem upload
  links: { github, linkedin, email },

  skills: string[],

  languages: Array<{
    language: string,
    level: "básico" | "intermediário" | "avançado" | "fluente" | "nativo",
  }>,

  education: Array<{
    institution: string,
    course: string,
    startDate: string,
    endDate: string | null,          // null = em andamento
    technologies?: string[],
  }>,

  certificates: Array<{
    name: string,
    issuer: string,
    issuedAt: string,
    credentialUrl: string | null,
  }>,
}
```

Com i18n (`next-intl`) decidido, `bio`, `headline` e `objective` viram um arquivo por locale (`profile.pt.ts` / `profile.en.ts`) em vez de string única — mesma estrutura, campo de texto duplicado por idioma. Campos não-textuais (`links`, `photoUrl`, datas) não duplicam.
