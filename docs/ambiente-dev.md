# Ambiente de desenvolvimento

[← voltar ao índice](./README.md)

`docker-compose.yml` na raiz — só Postgres, `apps/api` roda fora de container em dev:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: portfolio
    ports: ["127.0.0.1:5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

`POSTGRES_DB` precisa bater com o banco do `DATABASE_URL` — sem ele o container só cria o banco padrão `postgres` e a conexão falha. Porta em loopback: a API roda fora do container, ninguém precisa desta porta pela rede, e a credencial aqui é trivial.

`.env.example`:

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/portfolio
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=30d
COOKIE_DOMAIN=localhost
FRONTEND_URL=http://localhost:3001
SENTRY_DSN=
```

Portas: `apps/api` em **3000** (`PORT`), `apps/web` em **3001** — fixada via `next dev -p 3001`, já que o default do Next também é 3000 e colidiria com a API. É o que faz `FRONTEND_URL` bater com a realidade sem configuração extra.

Os dois segredos JWT são validados com mínimo de 32 caracteres — HS256 depende inteiramente da entropia do segredo, e um valor curto é quebrável offline a partir de qualquer token capturado. Gere com `openssl rand -base64 48`.
