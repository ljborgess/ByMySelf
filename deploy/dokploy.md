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

No Dokploy, para cada aplicação:

| Campo | API | Web |
| --- | --- | --- |
| Build Type | Dockerfile | Dockerfile |
| Dockerfile Path | `apps/api/Dockerfile` | `apps/web/Dockerfile` |
| Build Context | `.` (raiz) | `.` (raiz) |
| Build Args | — | `FRONTEND_URL=https://seu-dominio.com` |
| Porta exposta | `3100` | `3101` |

O build do web **falha** se `FRONTEND_URL` não for passado — de propósito. Um
default de localhost deixaria o build passar e a imagem serviria metadata
apontando para `http://localhost:3101`, errado de um jeito que só aparece
quando um crawler lê.

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

### API

| Variável | Observação |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `3100` (já é default na imagem) |
| `DATABASE_URL` | aponta para o Postgres de #36 |
| `JWT_ACCESS_SECRET` | mínimo 32 chars, independente do refresh |
| `JWT_REFRESH_SECRET` | mínimo 32 chars, independente do access |
| `JWT_ACCESS_EXPIRATION` | `15m` — limite do RNF-SEG4 |
| `JWT_REFRESH_EXPIRATION` | entre `7d` e `30d` |
| `COOKIE_DOMAIN` | domínio de produção |
| `FRONTEND_URL` | usado no CORS — finalizado em #38 |
| `TRUST_PROXY_HOPS` | **contagem de saltos, não booleano.** `1` atrás do proxy do Dokploy. Ver README: com `trust proxy: true` o `X-Forwarded-For` seria trivialmente forjável e o rate limit por IP viraria um balde único |
| `SENTRY_DSN` | opcional |

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

## Migrations

O runtime da API não tem `ts-node` (é devDependency), então `pnpm db:migrate`
não roda na imagem de produção. O `nest build` compila o script junto, e a
pasta `drizzle/` é copiada para a imagem, então o comando é:

```bash
node dist/database/migrate
```

Rodar isso como pre-deploy command no Dokploy, ou manualmente antes do primeiro
deploy. Fica finalizado em #36, junto com o Postgres de produção.

## O que ainda depende de acesso ao VPS

As duas aplicações **não** foram registradas no painel do Dokploy — isso exige
acesso ao VPS, que não faz parte do que dá para entregar pelo repositório. Os
Dockerfiles estão verificados (build + execução dos containers, ver o MR), e
esta página é o que resta preencher no painel.
