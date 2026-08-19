# Skills do projeto

47 skills selecionadas para o trainer-crm, copiadas de `~/.claude/skills` em 2026-08-15. Ficam versionadas aqui para que qualquer máquina que clone o repositório tenha o mesmo ferramental, sem depender do ambiente local.

**A fonte continua sendo o repositório pessoal de skills.** Estas são cópias congeladas para este projeto — se uma skill melhorar lá, é preciso trazer de volta manualmente. Não editar aqui esperando que propague.

---

## Por que estas

### Planejamento e arquitetura

O conjunto que produziu esta documentação. Está aqui para que o mesmo método continue disponível a quem pegar o projeto.

| Skill | Para quê |
|---|---|
| `project-kickoff` | Orquestra o fluxo completo de ideia a plano de implementação, em cinco fases |
| `project-planner` | Planejamento conversacional, uma pergunta por vez |
| `stack-scaffold` | Bootstrap técnico do monorepo — a próxima etapa se a proposta for aprovada |
| `to-prd` · `implement-prd` · `implement` | Do plano ao PRD, e do PRD ao código |
| `improve-codebase-architecture` | Refatoração estrutural depois que houver código |
| `research` | Investigação contra fonte primária. Foi assim que Chatwoot e Evolution API foram avaliadas e descartadas — lendo licença e código, não opinião |
| `diagnose` | Loop de diagnóstico para defeito difícil |
| `full-output-enforcement` | Contra truncamento em geração longa |

### Método
| Skill | Para quê |
|---|---|
| `grill-me` · `grill-with-docs` | Foi o método de toda a fase de proposta. Os seis ADRs saíram daqui |
| `fable-method` | Loop padrão para tarefa multi-step sem skill específica |
| `estimation` | Produziu a estimativa decomposta de ~476h no `Spec.md` |
| `handoff` | Entre sessões e entre máquinas |

### Fase atual — proposta
| Skill | Para quê |
|---|---|
| `prototype` | As três telas que faltam: Planos, Importação, Cobranças |
| `proposta-comercial` | Fechamento e geração do PDF |

### Modelagem
| Skill | Para quê |
|---|---|
| `domain-modeling` | Produziu a `RN21` e a `RN22`. Volta sempre que o modelo for tocado |
| `codebase-design` | Módulos profundos, onde ficam as costuras |

### Backend — NestJS + Drizzle + pg-boss
| Skill | Para quê |
|---|---|
| `backend-service-conventions` | Camadas e limites de módulo. Regra permanente da casa |
| `input-validation` | `nestjs-zod` na fronteira. Regra permanente da casa |
| `api-design` | Contrato REST |
| `background-jobs` | A fila em Postgres: retry, backoff, idempotência (`RNF-CON1`) |
| `rate-limiting` | `RNF-DES2` e o limite da Cloud API |
| `auth-patterns` | `RF-AUT1` a `RF-AUT6`, dois usuários sem RBAC |

### Banco — Postgres puro
| Skill | Para quê |
|---|---|
| `postgres-conventions` | Postgres direto, sem Supabase |
| `safe-migrations` | `drizzle-kit`, expand-contract |
| `query-performance` | A view de situação da ADR 005, avaliada em quase toda leitura |
| `seed-data` | `RF-OPS1` e dados de desenvolvimento |
| `backup-restore` | `RF-OPS2` exige **restauração testada**, não só backup |

### Frontend — Next.js + Tailwind + shadcn/ui
| Skill | Para quê |
|---|---|
| `frontend-conventions` | Regra permanente da casa para todo `.tsx` |
| `forms-validation` | E.164 e documentos brasileiros validados por dígito, não por formato |
| `error-ux` | Os quatro estados de toda tela com dados, e o que a `RNF-USA3` exige |
| `client-state-management` | Onde o estado mora |
| `tanstack-query-patterns` | A correta para backend não-Supabase |

### Infraestrutura e operação
| Skill | Para quê |
|---|---|
| `container-conventions` | Docker e Dokploy |
| `environment-config` | Validação de env na subida |
| `secrets-management` | `RNF-SEG3`, credenciais fora do repositório |
| `structured-logging` | `RF-OPS3` e a proibição de registrar dado pessoal |
| `error-tracking` | `RF-OPS3` — a escolha entre Sentry e GlitchTip ainda está aberta |
| `ci-cd-pipeline` | Pipeline pelo Dokploy |
| `rollback-runbook` | Reverter deploy sem reverter migration |

### Qualidade e conformidade
| Skill | Para quê |
|---|---|
| `tdd` | O `RNF-MAN2` exige cobertura automatizada das **27 regras de negócio** |
| `integration-testing` | Banco real em container, não mock |
| `security-review-checklist` | Verificação de assinatura de webhook, o ponto que o `Spec` marca como o mais fácil de errar |
| `lgpd-checklist` | `RNF-LGP1` a `RNF-LGP8`, incluindo dado sensível |
| `docs-writing` | ADRs e documentação de entrega (`RNF-MAN3`) |

---

## Deixadas de fora de propósito

| Skill | Por quê |
|---|---|
| `supabase-postgres` · `supabase-hooks` | Supabase foi recusado na ADR 006 |
| `code-reviewer` | É específica de React + TanStack + **Supabase multi-inquilino**. Stack errada para este projeto |
| `multi-tenant-isolation-audit` | Mono-inquilino, dois usuários. Não se aplica |
| `caching-strategy` | Nenhum requisito pede cache |
| `cloudflare*` · `wrangler` · `workers-best-practices` | Cloudflare saiu na ADR 004 |
| `e2e-testing` | O `RNF-MAN2` pede regras de negócio cobertas, o que `tdd` e `integration-testing` já endereçam |
| `accessibility-audit` · `health-checks-metrics` · `dependency-audit` · `incident-postmortem` | Nenhum requisito atual as invoca. Trazer quando houver |
