# syntax=docker/dockerfile:1

# Build context is the repo root, not apps/api: this is a pnpm workspace, and
# the API depends on packages/shared plus the root lockfile. Build with:
#   docker build -f apps/api/Dockerfile -t bymyself-api .

# ---------------------------------------------------------------------------
# base -- pinned to the same major the repo pins in .nvmrc and package.json
# engines. Alpine keeps the runtime image small; the one native dependency
# (argon2) is handled in the deps stage below.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# corepack ships with Node and reads the packageManager field from
# package.json, so the image cannot drift from the version CI and developers
# use.
RUN corepack enable

# ---------------------------------------------------------------------------
# deps -- install with the lockfile, in a layer that only busts when a
# manifest changes. Copying just the manifests first is what keeps a source
# edit from reinstalling the whole tree.
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /repo

# argon2 publishes prebuilds for glibc but not for musl, so on Alpine it is
# compiled from source. These are build-stage only and never reach the
# runtime image.
RUN apk add --no-cache python3 make g++

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
# Source and not just the manifest: @portfolio/shared compiles itself in a
# `prepare` script, and its package.json `main` points at the dist that
# produces. Manifest alone and the install fails on tsc finding no inputs;
# without tsconfig.base.json above it fails again on the compiler options it
# extends. It is a handful of schema files, so the layer is cheap to bust.
COPY packages/shared packages/shared

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter api... --filter .

# ---------------------------------------------------------------------------
# builder -- compile TypeScript, then produce a pruned production tree.
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /repo

COPY apps/api apps/api

RUN pnpm --filter api build

# `pnpm deploy` resolves the workspace link to packages/shared into a real
# directory and drops every devDependency, giving a node_modules that can be
# copied into a clean image as-is. --legacy is required: without it pnpm 10
# refuses to deploy from a workspace that does not set
# inject-workspace-packages.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm deploy --filter api --prod --legacy /prod-api

# ---------------------------------------------------------------------------
# runner -- no pnpm, no compilers, no source, no devDependencies.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# The API binds this; Dokploy maps it. Kept as ENV rather than hardcoded in
# main.ts so the same image can be run on another port without a rebuild.
ENV PORT=3100

# Commit que originou a imagem, exposto em GET /health.
#
# É o que permite ao pipeline saber que está falando com o container *novo*:
# logo após o webhook, a versão anterior ainda responde `ok`, e sem identidade
# de build um rollout que nunca começou passaria como deploy bem-sucedido.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

# node:22-alpine already ships an unprivileged `node` user (uid 1000). Reusing
# it beats creating another: it owns nothing outside /app, and the app never
# needs to write to the image.
COPY --from=builder --chown=node:node /prod-api/node_modules ./node_modules
COPY --from=builder --chown=node:node /prod-api/dist ./dist
COPY --from=builder --chown=node:node /prod-api/package.json ./package.json

# Drizzle migration files are read at runtime by the migrate entrypoint, and
# `nest build` does not copy non-TS assets into dist.
COPY --from=builder --chown=node:node /repo/apps/api/drizzle ./drizzle

# Applies pending migrations before starting the server, so a fresh
# production database cannot leave the API serving against missing tables
# (issue #36). See the script for why this lives here rather than in a
# Dokploy pre-deploy field.
# Left owned by root, not the `node` user that runs it: a process should not
# be able to rewrite the script that starts it.
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 555 /usr/local/bin/docker-entrypoint.sh

USER node

EXPOSE 3100

# Gives Dokploy a real readiness signal instead of "the process is alive".
# GET /health checks the database connection too, so a container that cannot
# reach Postgres reports unhealthy rather than accepting traffic it cannot
# serve. Uses Node rather than curl, which Alpine does not ship.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3100)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The entrypoint migrates, then `exec`s this CMD -- so the server still ends
# up as PID 1 and SIGTERM from Dokploy reaches Node itself, letting the
# graceful shutdown in main.ts run.
#
# `node dist/main` directly, not `pnpm start:prod`: one less process in the
# tree, and a package manager in between would swallow the signal.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
