# syntax=docker/dockerfile:1

# Build context is the repo root, not apps/api: this is a pnpm workspace, and
# the API depends on packages/shared plus the root lockfile. Build with:
#   docker build -f apps/api/Dockerfile -t bymyself-api .

# ---------------------------------------------------------------------------
# base -- pinned to the same major the repo pins in .nvmrc and package.json
# engines. Alpine keeps the runtime image small.
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

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
# Source and not just the manifest: @portfolio/shared compiles itself in a
# `prepare` script, and its package.json `main` points at the dist that
# produces. Manifest alone and the install fails on tsc finding no inputs;
# without tsconfig.base.json above it fails again on the compiler options it
# extends. It is a handful of type files, so the layer is cheap to bust.
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

# Issue #35 pede uma imagem que não carregue "dev dependencies or source maps
# unnecessarily", e o build emitia `.js.map` mais os `.d.ts`.
#
# São peso morto literal: `source-map-support` é devDependency, não é
# importado em nenhum lugar do src, e nem existe no runtime — então nada
# consegue consumir esses mapas. Os `.d.ts` só servem a quem compila contra o
# pacote, o que ninguém faz aqui dentro.
#
# Removido no builder e não desligado no tsconfig porque em desenvolvimento
# source map é útil; o que não se justifica é embarcá-lo onde não há como usar.
RUN find /repo/apps/api/dist \
      \( -name '*.js.map' -o -name '*.d.ts' -o -name '*.d.ts.map' \) \
      -delete

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

USER node

EXPOSE 3100

# Gives Dokploy a real readiness signal instead of "the process is alive".
# Sem banco (docs/decisao-projetos-github-pins.md), o probe só confirma que o
# processo Nest está de pé. Uses Node rather than curl, which Alpine does not
# ship.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3100)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `node dist/main` directly, not `pnpm start:prod`: one less process in the
# tree, and a package manager in between would swallow the SIGTERM Dokploy
# sends, breaking the graceful shutdown in main.ts.
CMD ["node", "dist/main"]
