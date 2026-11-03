# Skills do projeto

As skills vêm do **marketplace B2ML**, não deste diretório. A seleção fica em
[`../settings.json`](../settings.json) — 44 plugins habilitados, entre eles o `core@b2ml`
que entra em todo projeto.

Quem clona o repositório recebe as skills automaticamente pelo Claude Code, desde que
tenha acesso ao GitLab da B2ML (o clone usa as credenciais git da máquina). Adicionar
uma skill é uma linha no `settings.json`, via MR como qualquer outra mudança.

Antes elas eram copiadas para cá e congeladas — o que exigia trazer melhorias de volta
à mão. Pelo marketplace, a atualização chega via git.

## O que ainda mora aqui

Cinco skills sem equivalente no marketplace. Ficam versionadas porque não há de onde
buscá-las:

| Skill | Para quê |
|---|---|
| `fable-method` | Loop padrão para tarefa multi-step sem skill específica |
| `full-output-enforcement` | Contra truncamento em geração longa |
| `grill-with-docs` | Stress-test de plano contra o modelo de domínio documentado |
| `implement` | Do PRD ao código (o marketplace só tem `implement-prd`) |
| `impeccable` | Design de front — shape, critique, audit, polish etc. Lê `PRODUCT.md` e `DESIGN.md` da raiz |

O caminho natural é contribuí-las ao marketplace. Feito isso, podem sair daqui e o
diretório deixa de existir.

### impeccable

Trazida do ProLobby (v4.3.1, engine 0.1.5). Vem com `reference/` (um playbook por
sub-comando) e com os quatro agentes que ela despacha, em
[`../agents/`](../agents/) (`impeccable-*`).

O binário da engine (`scripts/bin/`, 15 MB por plataforma) **não** é versionado: o
launcher `scripts/impeccable` baixa a versão fixada no primeiro uso. Precisa de rede
nessa primeira vez.

O detector roda sozinho via hook em [`../settings.json`](../settings.json): checagem
rápida após cada `Edit`/`Write` em UI, passe completo no `Stop`. Estado local fica em
`.impeccable/` na raiz, ignorado pelo git.

## Diretório oculto

O `.gitignore` versiona apenas o `settings.json`, os agentes em `agents/` e estas cinco
skills. Todo o resto sob `.claude/` é estado local — não entra em commit.
