# Deploy no Dokploy

Configuração das duas aplicações no Dokploy. Os Dockerfiles em
`apps/api/Dockerfile` e `apps/web/Dockerfile` são o artefato de verdade — este
documento é o que precisa ser preenchido no painel do Dokploy para usá-los.

> **Fora do escopo desta sub-issue:** Postgres de produção e volume (#36),
> HTTPS e domínio (#37), e os segredos reais de produção com o CORS final
> (#38). As variáveis abaixo listam o *contrato* — os valores vêm de #38.

## Contexto de build

As duas imagens buildam a partir da **raiz do repositório**, não de dentro de
`apps/*`. Isso não é preferência: o projeto é um workspace pnpm, e o build
precisa do `pnpm-lock.yaml` da raiz e de `packages/shared`.

```bash
# API
docker build -f apps/api/Dockerfile -t bymyself-api .

# Web — FRONTEND_URL é build-arg, ver abaixo
docker build -f apps/web/Dockerfile \
  --build-arg FRONTEND_URL=https://seu-dominio.com \
  -t bymyself-web .
```

## Como criar no Dokploy

**Um único projeto do tipo Docker Compose**, apontando para
`deploy/docker-compose.prod.yml`. Ele já declara os três serviços (postgres,
api, web), o volume persistente e as dependências entre eles — criar api e web
como duas aplicações Dockerfile separadas deixaria o Postgres e o volume de
fora, que é justamente o que #36 resolve.

| Campo | Valor |
| --- | --- |
| Deployment Type | Docker Compose |
| Compose Path | `deploy/docker-compose.prod.yml` |
| Build Context | raiz do repositório |

O compose já resolve `build.context: ..` e os `dockerfile:` de cada app, então
não há caminho de Dockerfile para preencher à mão.

O build do web **falha** se `FRONTEND_URL` não for passado — de propósito. Um
default de localhost deixaria o build passar e a imagem serviria metadata
apontando para `http://localhost:3101`, errado de um jeito que só aparece
quando um crawler lê. O compose repassa a variável como build arg
automaticamente.

## Domínios, DNS e HTTPS

Dois subdomínios, um por serviço. Separar a API do site é o que permite ao
`SameSite=Strict` do cookie de auth continuar valendo e ao CORS ter uma origem
única e explícita.

| Serviço | Variável | Exemplo |
| --- | --- | --- |
| Site | `WEB_DOMAIN` | `bymyself.com.br` |
| API | `API_DOMAIN` | `api.bymyself.com.br` |

### 1. DNS (antes de subir a stack)

Um registro `A` por domínio, apontando para o IP do VPS:

```
bymyself.com.br.       A    <IP-do-VPS>
api.bymyself.com.br.   A    <IP-do-VPS>
```

Faça isso **antes** do primeiro deploy. O Let's Encrypt valida por HTTP-01:
ele resolve o domínio e busca um arquivo no seu servidor. Se o DNS ainda não
propagou, a emissão falha — e falhas repetidas batem no limite de *validações
com falha* (5 por conta, por hostname, por hora). Não é catastrófico: o balde
reseta de hora em hora. Ainda assim, subir com o DNS pronto evita uma primeira
hora de tentativas inúteis.

#### www

O compose roteia o apex (`bymyself.com.br`), não `www`. Isso é uma decisão, e
tem uma pegadinha:

- **Não criar registro DNS para `www`** — é o default. O nome não resolve,
  nunca chega no proxy, e não existe caminho quebrado.
- **Criar o registro `www` sem configurar o router** é o pior dos mundos: o
  nome resolve, bate no Traefik, e o visitante recebe 404 **mais** um erro de
  certificado, porque o cert não cobre esse hostname.

Se quiser suportar `www`, crie o registro A **e** adicione estas labels ao
serviço `web`, redirecionando para o apex:

```yaml
- traefik.http.routers.bymyself-www.rule=Host(`www.SEU-DOMINIO`)
- traefik.http.routers.bymyself-www.entrypoints=websecure
- traefik.http.routers.bymyself-www.tls=true
- traefik.http.routers.bymyself-www.tls.certresolver=letsencrypt
- traefik.http.routers.bymyself-www.middlewares=bymyself-www-redirect
- traefik.http.middlewares.bymyself-www-redirect.redirectregex.regex=^https://[^/]+/(.*)
- traefik.http.middlewares.bymyself-www-redirect.redirectregex.replacement=https://SEU-DOMINIO/$${1}
- traefik.http.middlewares.bymyself-www-redirect.redirectregex.permanent=true
```

Redirecionar para o apex, e não servir o site nos dois, evita conteúdo
duplicado — o mesmo motivo pelo qual `localePrefix: 'always'` mantém uma única
URL canônica por página (RNF-SEO1).

### 2. Dokploy

Nada além das variáveis. As labels de Traefik já estão no compose — router
HTTP, router HTTPS, redirect e HSTS, para os dois serviços. O Dokploy só
precisa que `WEB_DOMAIN`, `API_DOMAIN` e, se o resolver dele tiver outro nome,
`CERT_RESOLVER` estejam definidas.

O compose **recusa subir** sem `WEB_DOMAIN` e `API_DOMAIN`.

### 3. Variáveis que dependem do domínio final

Estas existem desde o Scaffold, mas só agora têm valor real. Ficam finalizadas
em #38:

| Variável | Valor |
| --- | --- |
| `FRONTEND_URL` | `https://<WEB_DOMAIN>` — **com https**, e é build arg do web |
| `COOKIE_DOMAIN` | o domínio do cookie de auth |

`FRONTEND_URL` errado aqui é caro: o site é pré-renderizado, então a URL entra
no HTML no build. Trocar depois exige rebuild, não só restart.

### O que é automático e o que não é

- **Certificado e renovação** — automáticos (Let's Encrypt via Dokploy). Sem
  cron, sem passo manual.
- **Redirect HTTP → HTTPS** — automático, `301` permanente, nos dois domínios.
- **HSTS** — `max-age=31536000`, sem `preload`. Entrar na lista de preload dos
  browsers é praticamente irreversível e trava o domínio em HTTPS por anos:
  é decisão do dono do domínio, não default de config. `stsIncludeSubdomains`
  também é opt-in, via `HSTS_INCLUDE_SUBDOMAINS=true`.
- **Compra do domínio e criação dos registros DNS** — manual, seu.

## Por que `FRONTEND_URL` é build-arg no web (e só nele)

A maioria das páginas do site é pré-renderizada no build — isso é deliberado
(RNF-SEO2), e o `i18n/request.ts` foi escrito para preservar essa
pré-renderização. O Next resolve `metadataBase` **durante** o build, então as
URLs canônicas, o `og:image` e cada `<loc>` do sitemap são gravados no HTML
naquele momento.

Injetar `FRONTEND_URL` apenas em runtime resultaria em páginas anunciando
`http://localhost:3101` para os crawlers. Verificado: buildando com
`--build-arg FRONTEND_URL=https://bymyself.example.com`, o container serve
`<meta property="og:image" content="https://bymyself.example.com/og-default.png">`
e `<loc>https://bymyself.example.com/pt</loc>`.

Não é segredo — é o endereço público do site. Os segredos continuam fora da
imagem e chegam em runtime.

`API_URL` **não** é build-arg: toda rota que lê a API é dinâmica ou ISR, então
resolve a variável por request.

## Variáveis de ambiente (runtime)

Nenhuma é embutida na imagem. Ambas as apps validam a configuração no boot e
**recusam subir** com valores inválidos, em vez de falhar no primeiro request.
O compose usa a forma `${VAR:?...}` nas obrigatórias, então um deploy sem elas
também falha em vez de subir com valor em branco.

### Roteamento e TLS

| Variável | Observação |
| --- | --- |
| `WEB_DOMAIN` | obrigatória. Domínio do site, sem esquema |
| `API_DOMAIN` | obrigatória. Domínio da API, sem esquema |
| `CERT_RESOLVER` | default `letsencrypt` — nome do resolver no Traefik do Dokploy |
| `HSTS_INCLUDE_SUBDOMAINS` | default `false`. `true` só se **todo** subdomínio já servir HTTPS |

### Postgres

| Variável | Observação |
| --- | --- |
| `POSTGRES_USER` | obrigatória |
| `POSTGRES_PASSWORD` | obrigatória |
| `POSTGRES_DB` | default `portfolio` |

### API

| Variável | Observação |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3100` (já é default na imagem) |
| `DATABASE_URL` | URL completa, ex. `postgresql://user:senha@postgres:5432/portfolio`. **Percent-encode a senha**: ela fica na userinfo da URL, então um `/`, `@`, `:` ou `#` cru faz o parser ler host e database errados — e o erro aparece como "banco não existe", que joga a investigação para o lado errado. **A role aqui é a restrita** — ver "Roles do Postgres" abaixo |
| `MIGRATION_DATABASE_URL` | obrigatória. Mesma forma de `DATABASE_URL`, mas com a role de superusuário (`POSTGRES_USER`/`POSTGRES_PASSWORD` acima). Usada só para migrations e para criar a role de `DATABASE_URL` — ver "Roles do Postgres" |
| `JWT_ACCESS_SECRET` | mínimo 32 chars, independente do refresh |
| `JWT_REFRESH_SECRET` | mínimo 32 chars, independente do access |
| `JWT_ACCESS_EXPIRATION` | `15m` — limite do RNF-SEG4 |
| `JWT_REFRESH_EXPIRATION` | entre `7d` e `30d` |
| `COOKIE_DOMAIN` | domínio de produção |
| `FRONTEND_URL` | usado no CORS — finalizado em #38 |
| `TRUST_PROXY_HOPS` | **contagem de saltos, não booleano.** `1` atrás do proxy do Dokploy. Ver README: com `trust proxy: true` o `X-Forwarded-For` seria trivialmente forjável e o rate limit por IP viraria um balde único |
| `SENTRY_DSN` | opcional |
| `RUN_MIGRATIONS_ON_START` | default `true`. Ver Migrations abaixo |
| `MIGRATION_MAX_ATTEMPTS` | default `10`. Inteiro positivo — valor inválido faz o container recusar subir, em vez de tentar para sempre |

### Web

| Variável | Observação |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3101` (já é default na imagem) |
| `HOSTNAME` | `0.0.0.0` — já default na imagem. Sem isso o servidor standalone escuta em `127.0.0.1` e fica inalcançável de fora do container, e a falha parece app morta em vez de problema de binding |
| `API_URL` | endereço interno da API, ex. `http://bymyself-api:3100`. Só para SSR — o browser não resolve esse nome |
| `NEXT_PUBLIC_API_URL` | **build arg, não runtime.** Endereço *público* da API, para as chamadas que saem do browser (login do painel). O Next inlina toda variável `NEXT_PUBLIC_` no bundle do cliente durante o build, então definir em runtime não tem efeito. O build **falha** se faltar |
| `FRONTEND_URL` | **também em runtime.** A imagem já vem com o valor do build-arg, então normalmente não precisa mexer — mas se for sobrescrito, tem que ser o mesmo valor do build. O `sitemap.xml` é ISR de 1h: uma hora depois do boot ele regenera lendo essa variável, e com ela errada todo `<loc>` sai errado. O `robots.txt` é estático (gravado no build) e não depende do runtime |

## Healthchecks

As duas imagens declaram `HEALTHCHECK`, então o Dokploy tem sinal real de
prontidão em vez de "o processo está vivo".

- **API** → `GET /health`, que verifica a conexão com o banco. Um container
  que não alcança o Postgres reporta unhealthy em vez de aceitar tráfego que
  não consegue servir.
- **Web** → `GET /pt`. É pré-renderizada e não chama serviço externo, então
  continua sendo sinal do próprio site e **não fica vermelha quando a API
  cai** — o site tem estado de erro próprio para isso.

## Postgres e volume persistente

`deploy/docker-compose.prod.yml` define a stack inteira — Postgres, api e web.
No Dokploy, criar como **Docker Compose**, apontando para esse arquivo.

Pontos que não são detalhe:

- **Volume nomeado (`pgdata`), não bind mount.** O ciclo de vida dele é
  independente dos containers de aplicação: `docker compose down` seguido de
  `up` recria tudo e o dado continua lá. Verificado (ver MR) — só `down -v`
  apaga, e isso é deliberado.
- **O Postgres não publica porta no host.** É alcançado pela rede interna do
  compose. Expor 5432 colocaria o banco de produção na internet, e nada fora
  dessa rede precisa dele. Para inspecionar, `docker compose exec postgres
  psql`.
- **Nenhum segredo no arquivo.** Toda variável sensível usa a forma
  `${VAR:?...}`, então um deploy sem ela **falha** em vez de subir com senha em
  branco. Os valores vêm dos secrets do Dokploy (#38).
- **`depends_on: condition: service_healthy`** faz a api esperar o Postgres
  estar de fato aceitando conexão, não só o container existir.

## Roles do Postgres (#88)

Duas roles, duas variáveis:

- **`POSTGRES_USER`/`MIGRATION_DATABASE_URL`** — superusuário, criado pela
  própria imagem oficial do Postgres no primeiro boot. Só faz DDL: aplica
  migrations e cria/atualiza a role de `DATABASE_URL`.
- **`DATABASE_URL`** — a role que a API usa de fato em runtime. Sem
  `SUPERUSER`, `CREATEDB` nem `CREATEROLE`, com `SELECT`/`INSERT`/`UPDATE`/`DELETE`
  nas tabelas de `public` e nada além disso. Uma brecha futura de SQL fica
  limitada ao que a app legitimamente faz, em vez de virar controle total do
  banco.

A role de `DATABASE_URL` **não existe por si só** — quem a cria é o script
de bootstrap (abaixo), lendo o username de dentro da própria URL. Não há
convenção de nome para criar à mão: o que estiver em `DATABASE_URL` é o que
o bootstrap garante que existe, com esses privilégios, a cada boot.

A aplicação também confere isso sozinha: no boot, em produção, recusa subir
se a role de `DATABASE_URL` for superusuário (`DatabaseModule`, consultando
`pg_roles`) — a mesma garantia checada, não presumida, que
`env.schema.ts` já aplica a segredo curto e `COOKIE_DOMAIN` de loopback.

## Migrations

Rodam sozinhas. O entrypoint da imagem da api
(`apps/api/docker-entrypoint.sh`) aplica as migrations pendentes e só então
executa o servidor — então um banco novo nunca deixa a API respondendo contra
tabelas que não existem (#36, user story 3). São idempotentes: no segundo
boot não fazem nada.

Logo em seguida, o mesmo entrypoint roda o bootstrap da role (ver "Roles do
Postgres" acima) — depois das migrations, porque os `GRANT` dependem das
tabelas já existirem. Também idempotente.

Fica no entrypoint, e não num campo de pre-deploy do painel, de propósito: um
passo que mora numa caixinha de configuração é um passo que dá para esquecer
de preencher.

Para o caso que a issue deixa em aberto — se um dia isto rodar com mais de uma
réplica, migrators concorrentes no mesmo banco são piores que um passo único
deliberado — dá para desligar com `RUN_MIGRATIONS_ON_START=false` e rodar
manualmente:

```bash
docker compose exec api node dist/database/migrate
```

> A issue #36 menciona `mikro-orm migration:up`. Este projeto usa **Drizzle**,
> não MikroORM — o comando acima é o correto.

## Deploy automático (CI)

Um merge em `main` dispara `.github/workflows/ci.yml`: o job `quality` roda
primeiro e, só se passar, o `build-and-deploy` publica as imagens e chama o
Dokploy.

### Por que registry, e não rebuild no Dokploy

O CI publica as duas imagens no GHCR com a tag do SHA do commit, e o Dokploy
puxa exatamente essa tag. A alternativa — Dokploy buildar da origem — deixaria
produção rodando um build *diferente* do que o CI validou, que é justamente o
problema que a #38 enuncia.

O compose declara `image:` e `build:` juntos: com `IMAGE_TAG` apontando para
uma tag publicada, `docker compose pull` traz o artefato do CI; sem ela,
`docker compose build` continua funcionando localmente.

### Secrets e variables no GitHub

Secrets são para credencial; variables para o que é público. Guardar o domínio
como secret só esconderia de quem precisa conferir se está certo.

| Nome | Tipo | Observação |
| --- | --- | --- |
| `DOKPLOY_DEPLOY_WEBHOOK` | secret | URL de deploy da aplicação no Dokploy |
| `FRONTEND_URL` | variable | `https://<WEB_DOMAIN>` — build arg do web |
| `NEXT_PUBLIC_API_URL` | variable | `https://<API_DOMAIN>` — build arg do web; inlinado no bundle do cliente |
| `API_DOMAIN` | variable | usado para conferir `/health` após o deploy |

O `GITHUB_TOKEN` cobre o login no GHCR (`permissions: packages: write`), então
não há credencial de registry para guardar.

### No Dokploy

Definir no ambiente da stack:

```
API_IMAGE=ghcr.io/<owner>/<repo>-api
WEB_IMAGE=ghcr.io/<owner>/<repo>-web
IMAGE_TAG=latest
```

`latest` e não um SHA fixo: o webhook do Dokploy não carrega payload, então o
CI não tem como injetar a tag do commit. Um SHA aqui ficaria congelado e cada
merge publicaria imagens novas enquanto produção redeploya a versão antiga.
Com `latest`, o CI acabou de apontar essa tag para as imagens deste commit.

O deploy precisa **puxar** antes de subir (`docker compose pull`, ou
`--pull always`): sem isso o Docker reusa a `latest` que já está em cache no
host, que é justamente a versão anterior.

As tags de SHA continuam publicadas e servem para rollback — fixar
`IMAGE_TAG=<sha>` volta para uma versão específica.

Se o pacote no GHCR for privado, o VPS precisa de `docker login ghcr.io` com um
token de leitura; sem isso o `pull` falha.

### Verificação pós-deploy

O webhook responde assim que aceita o pedido, não quando o rollout termina.
Por isso o job faz polling em `https://<API_DOMAIN>/health` por até 5 minutos
(user story 4).

Ele exige `"status":"ok"` **e** `"version"` igual ao SHA do commit. Só o
status não bastaria: a versão anterior continua respondendo `ok` durante todo
o rollout, então o job passaria de imediato mesmo que o deploy nunca tivesse
começado. É a diferença entre "a API está de pé" e "a API que este pipeline
construiu está de pé".

Isso também é a rede de segurança do arranjo de tags acima: se o Dokploy
subir uma imagem que não é a deste commit — cache velho, `pull` faltando,
`IMAGE_TAG` errado — o pipeline **falha** em vez de reportar sucesso.

## Segredos de produção (#39)

Todo segredo mora no gerenciamento de ambiente do Dokploy. Nenhum vai para o
repositório nem para um `.env` solto no disco do VPS.

### Gerando

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET  (rode de novo — tem que ser outro)
```

Valores **novos** para produção, distintos dos de desenvolvimento e dos usados
em CI. Se um dia o `.env` local vazar, produção não vai junto.

### O que a API recusa no boot

Estas não são recomendações — o app não sobe se forem violadas, porque cada
uma falha *silenciosamente* em produção se passar:

| Regra | O que acontece se passasse |
| --- | --- |
| `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET` | um access token capturado serve para forjar um refresh; a separação vira decorativa |
| Segredo não pode parecer placeholder | produção rodando com o valor do `.env.example` |
| `FRONTEND_URL` sem barra final nem caminho | o CORS compara literal com o header `Origin`, que nunca traz barra — **todo** request cross-origin passa a ser rejeitado, e o sintoma é "o login não funciona" |
| `FRONTEND_URL` https em produção | o cookie de auth é `Secure`; sobre http ele nunca chega e a sessão nunca existe |
| `COOKIE_DOMAIN` host puro | com esquema, porta ou caminho o browser descarta o cookie sem erro: login responde 200 e a sessão não persiste |
| `COOKIE_DOMAIN` ≠ `localhost` em produção | cookie escopado para um domínio que não é o do site |

### Checklist de fechamento da Fase 1

Auditoria do repositório e do histórico, feita nesta issue:

- `.env` está no `.gitignore` e **nunca** foi commitado (`git log --all -- .env` vazio)
- Nenhum arquivo `.env*` no histórico além do `.env.example`
- Nenhum valor de segredo real no histórico completo (busca por `-S` com regex)
- Nenhum segredo hardcoded em arquivo versionado
- `.env.example` só tem placeholder e valores locais

Para repetir a qualquer momento:

```bash
git check-ignore -v .env
git log --all --oneline -- .env
git grep -nIE "(secret|password|token)\s*[:=]\s*['\"][A-Za-z0-9+/_-]{16,}"
```

## O que ainda depende de acesso ao VPS

Nada disto foi provisionado no VPS: as aplicações **não** estão registradas no
painel do Dokploy, o Postgres de produção **não** existe, e não há domínio,
DNS nem certificado emitido. Isso exige acesso ao servidor e a um domínio
comprado — fora do que dá para entregar pelo repositório.

O que está entregue é o artefato que define essa infraestrutura — Dockerfiles,
compose de produção e as labels de roteamento/TLS — verificado por execução
real onde isso é possível:

| Verificado localmente | Só verificável em produção |
| --- | --- |
| Redirect HTTP → HTTPS (`301`) nos dois domínios | Emissão do certificado pelo Let's Encrypt |
| Roteamento por `Host()` chegando no serviço certo | Renovação automática |
| HSTS na resposta HTTPS | Validação HTTP-01 contra DNS real |
| Postgres inalcançável pelo proxy | |
| Host desconhecido responde 404 | |
| Migrations automáticas e persistência do volume | |

O TLS local usou o certificado self-signed default do Traefik: o que não dá
para testar sem domínio público é a **emissão**, não o roteamento — e o
roteamento é onde mora o erro de configuração.
