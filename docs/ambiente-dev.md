# Ambiente de desenvolvimento

[← voltar ao índice](./README.md)

`docker-compose.yml` na raiz — só Postgres, `apps/api` roda fora de container em dev:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

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
