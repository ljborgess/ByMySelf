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

Quatro skills sem equivalente no marketplace. Ficam versionadas porque não há de onde
buscá-las:

| Skill | Para quê |
|---|---|
| `fable-method` | Loop padrão para tarefa multi-step sem skill específica |
| `full-output-enforcement` | Contra truncamento em geração longa |
| `grill-with-docs` | Stress-test de plano contra o modelo de domínio documentado |
| `implement` | Do PRD ao código (o marketplace só tem `implement-prd`) |

O caminho natural é contribuí-las ao marketplace. Feito isso, podem sair daqui e o
diretório deixa de existir.

## Diretório oculto

O `.gitignore` versiona apenas o `settings.json` e estas quatro skills. Todo o resto sob
`.claude/` é estado local — não entra em commit.
