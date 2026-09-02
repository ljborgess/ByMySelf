# Deploy no Dokploy

Configuração das duas aplicações no Dokploy. Os Dockerfiles em
`apps/api/Dockerfile` e `apps/web/Dockerfile` são o artefato de verdade — este
documento é o que precisa ser preenchido no painel do Dokploy para usá-los.

> Sem banco de dados (docs/decisao-projetos-github-pins.md): a API é um proxy
> fino para a GraphQL API do GitHub, sem estado próprio nenhum.

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
`deploy/docker-compose.prod.yml`. Ele já declara os dois serviços (api, web)
e as dependências entre eles.

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

Dois subdomínios, um por serviço.

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

| Variável | Valor |
| --- | --- |
| `FRONTEND_URL` | `https://<WEB_DOMAIN>` — **com https**, e é build arg do web |

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
`http://localhost:3101` para os crawlers.

Não é segredo — é o endereço público do site. Os segredos continuam fora da
imagem e chegam em runtime.

`API_URL` **não** é build-arg: `/projetos` e a home são dinâmicas, então
resolvem a variável por request.

## Variáveis de ambiente (runtime)

Nenhuma é embutida na imagem. A API valida a configuração no boot e **recusa
subir** com valores inválidos, em vez de falhar no primeiro request. O
compose usa a forma `${VAR:?...}` nas obrigatórias, então um deploy sem elas
também falha em vez de subir com valor em branco.

### Roteamento e TLS

| Variável | Observação |
| --- | --- |
| `WEB_DOMAIN` | obrigatória. Domínio do site, sem esquema |
| `API_DOMAIN` | obrigatória. Domínio da API, sem esquema |
| `CERT_RESOLVER` | default `letsencrypt` — nome do resolver no Traefik do Dokploy |
| `HSTS_INCLUDE_SUBDOMAINS` | default `false`. `true` só se **todo** subdomínio já servir HTTPS |

### API

| Variável | Observação |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3100` (já é default na imagem) |
| `FRONTEND_URL` | usado no CORS |
| `GITHUB_TOKEN` | fine-grained PAT, "Public Repositories (read-only)", sem permissões extras |
| `GITHUB_USERNAME` | usuário do GitHub cujos pins são exibidos (`ljborgess`) |
| `TRUST_PROXY_HOPS` | **contagem de saltos, não booleano.** `1` atrás do proxy do Dokploy. Ver README: com `trust proxy: true` o `X-Forwarded-For` seria trivialmente forjável e o rate limit por IP viraria um balde único |
| `SENTRY_DSN` | opcional |

### Web

| Variável | Observação |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3101` (já é default na imagem) |
| `HOSTNAME` | `0.0.0.0` — já default na imagem. Sem isso o servidor standalone escuta em `127.0.0.1` e fica inalcançável de fora do container, e a falha parece app morta em vez de problema de binding |
| `API_URL` | endereço interno da API, ex. `http://bymyself-api:3100`. Usado só em SSR (server-side); o browser nunca fala com a API diretamente |
| `FRONTEND_URL` | **também em runtime.** A imagem já vem com o valor do build-arg, então normalmente não precisa mexer — mas se for sobrescrito, tem que ser o mesmo valor do build |

## Healthchecks

As duas imagens declaram `HEALTHCHECK`, então o Dokploy tem sinal real de
prontidão em vez de "o processo está vivo".

- **API** → `GET /health`. Sem banco para checar, só confirma que o processo
  Nest está de pé e respondendo.
- **Web** → `GET /pt`. É pré-renderizada e não chama serviço externo, então
  continua sendo sinal do próprio site e **não fica vermelha quando a API
  cai** — o site tem estado de erro próprio para isso.

## Deploy automático (CI)

Um merge em `main` dispara `.github/workflows/ci.yml`: o job `quality` roda
primeiro e, só se passar, o `build-and-deploy` publica as imagens e chama o
Dokploy.

### Por que registry, e não rebuild no Dokploy

O CI publica as duas imagens no GHCR com a tag do SHA do commit, e o Dokploy
puxa exatamente essa tag. A alternativa — Dokploy buildar da origem — deixaria
produção rodando um build *diferente* do que o CI validou.

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
| `API_DOMAIN` | variable | usado para conferir `/health` após o deploy |

O `GITHUB_TOKEN` que o job de CI usa para login no GHCR
(`permissions: packages: write`) é o token automático do workflow, **não** o
`GITHUB_TOKEN` que a API lê em runtime para ler os pins — são dois segredos
distintos que só compartilham o nome.

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
Por isso o job faz polling em `https://<API_DOMAIN>/health` por até 5 minutos.

Ele exige `"status":"ok"` **e** `"version"` igual ao SHA do commit. Só o
status não bastaria: a versão anterior continua respondendo `ok` durante todo
o rollout, então o job passaria de imediato mesmo que o deploy nunca tivesse
começado. É a diferença entre "a API está de pé" e "a API que este pipeline
construiu está de pé".

## Segredo de produção — GitHub token

O `GITHUB_TOKEN` que a API usa em runtime mora no gerenciamento de ambiente do
Dokploy. Nenhum vai para o repositório nem para um `.env` solto no disco do
VPS.

Gere um fine-grained Personal Access Token em
Settings → Developer settings → Personal access tokens → Fine-grained tokens,
com Repository access "Public Repositories (read-only)" e nenhuma permissão
extra — docs/decisao-projetos-github-pins.md tem o passo a passo completo.

### O que a API recusa no boot

| Regra | O que acontece se passasse |
| --- | --- |
| `FRONTEND_URL` sem barra final nem caminho | o CORS compara literal com o header `Origin`, que nunca traz barra — **todo** request cross-origin passa a ser rejeitado |
| `GITHUB_TOKEN` / `GITHUB_USERNAME` ausentes | o app recusa subir em vez de responder 500 em todo request a `/projects` |

## O que ainda depende de acesso ao VPS

Nada disto foi provisionado no VPS: as aplicações **não** estão registradas no
painel do Dokploy, e não há domínio, DNS nem certificado emitido. Isso exige
acesso ao servidor e a um domínio comprado — fora do que dá para entregar pelo
repositório.

O que está entregue é o artefato que define essa infraestrutura — Dockerfiles,
compose de produção e as labels de roteamento/TLS.

| Verificado localmente | Só verificável em produção |
| --- | --- |
| Redirect HTTP → HTTPS (`301`) nos dois domínios | Emissão do certificado pelo Let's Encrypt |
| Roteamento por `Host()` chegando no serviço certo | Renovação automática |
| HSTS na resposta HTTPS | Validação HTTP-01 contra DNS real |
| Host desconhecido responde 404 | |

O TLS local usou o certificado self-signed default do Traefik: o que não dá
para testar sem domínio público é a **emissão**, não o roteamento — e o
roteamento é onde mora o erro de configuração.
