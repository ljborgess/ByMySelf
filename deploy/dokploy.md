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
| `DATABASE_URL` | URL completa, ex. `postgresql://user:senha@postgres:5432/portfolio`. **Percent-encode a senha**: ela fica na userinfo da URL, então um `/`, `@`, `:` ou `#` cru faz o parser ler host e database errados — e o erro aparece como "banco não existe", que joga a investigação para o lado errado |
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
| `API_URL` | endereço interno da API, ex. `http://bymyself-api:3100` |
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

## Migrations

Rodam sozinhas. O entrypoint da imagem da api
(`apps/api/docker-entrypoint.sh`) aplica as migrations pendentes e só então
executa o servidor — então um banco novo nunca deixa a API respondendo contra
tabelas que não existem (#36, user story 3). São idempotentes: no segundo
boot não fazem nada.

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

## O que ainda depende de acesso ao VPS

Nada disto foi provisionado no VPS: as aplicações **não** estão registradas no
painel do Dokploy e o Postgres de produção **não** existe. Isso exige acesso ao
servidor, fora do que dá para entregar pelo repositório.

O que está entregue e verificado localmente é o artefato que define essa
infraestrutura — os Dockerfiles e o compose de produção, com as migrations
automáticas e a persistência do volume comprovadas por execução real (ver os
MRs #73 e o de #36).
