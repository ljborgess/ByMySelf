# syntax=docker/dockerfile:1

# Build context is the repo root, not apps/web: this is a pnpm workspace and
# the build needs the root lockfile plus packages/shared. Build with:
#   docker build -f apps/web/Dockerfile -t bymyself-web .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---------------------------------------------------------------------------
# deps
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
# Source and not just the manifest: @portfolio/shared compiles itself in a
# `prepare` script, and its package.json `main` points at the dist that
# produces. Manifest alone and the install fails on tsc finding no inputs;
# without tsconfig.base.json above it fails again on the compiler options it
# extends.
COPY packages/shared packages/shared

# `node-linker=hoisted` applies to this image build only -- developers and CI
# keep pnpm's normal isolated layout.
#
# It is required, not a preference. Next's standalone output copies the traced
# dependency tree, and under pnpm's default layout that tree is mostly
# *symlinks into the store*, recorded as absolute host paths
# (/repo/node_modules/.pnpm/...). Copying `.next/standalone` into the runtime
# image carries those links across dangling, and the server dies at startup on
# `Cannot find module .../@swc/helpers/...`. A flat node_modules makes the
# trace copy real files.
#
# The API image does not need this because `pnpm deploy` already materializes
# a real tree there; standalone tracing is what makes it necessary here.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --config.node-linker=hoisted \
      --filter web... --filter .

# ---------------------------------------------------------------------------
# builder
# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /repo

COPY apps/web apps/web

# FRONTEND_URL is a *build* input, not a runtime one, and that is a property
# of the app rather than an oversight. Most pages here are prerendered at
# build time (RNF-SEO2 keeps them static on purpose), and Next resolves
# `metadataBase` while prerendering -- so the canonical and og:image URLs are
# written into the HTML during `next build`. Injecting it only at runtime
# would ship pages advertising http://localhost:3101 to crawlers.
#
# It is not a secret: it is the public address of the site. Secrets stay out
# of the image and arrive at runtime, per the issue's contract.
ARG FRONTEND_URL
ENV FRONTEND_URL=$FRONTEND_URL

# Endereço público da API, para as chamadas que saem do browser -- hoje o
# login do painel (#23). Distinto de `API_URL`, que é o endereço interno da
# rede do compose e que o navegador de um visitante não resolve.
#
# Build arg porque o Next inlina toda variável `NEXT_PUBLIC_` no bundle do
# cliente durante o build; injetar em runtime não teria efeito. Não é segredo:
# é o endereço de um servidor público.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Sem default, e o build para em vez de seguir. Um default de localhost
# deixaria o build passar e entregaria páginas cujas URLs canônicas, og:image
# e entradas do sitemap apontam para localhost -- errado de um jeito que só
# aparece quando um crawler lê. O mesmo vale para a URL da API: o formulário
# de login apontaria para localhost e falharia no navegador de quem acessa.
RUN test -n "$FRONTEND_URL" || { \
      echo "ERROR: --build-arg FRONTEND_URL=https://your-domain is required." >&2; \
      echo "It is baked into the prerendered metadata and cannot be set later." >&2; \
      exit 1; \
    }
RUN test -n "$NEXT_PUBLIC_API_URL" || { \
      echo "ERROR: --build-arg NEXT_PUBLIC_API_URL=https://api.your-domain is required." >&2; \
      echo "It is inlined into the client bundle and cannot be set at runtime." >&2; \
      exit 1; \
    }

# API_URL is deliberately *not* a build arg. Every route that reads the API
# is dynamic or ISR, so it resolves the variable per request at runtime. The
# sitemap does attempt one fetch while prerendering; that failure is caught
# and logged (app/sitemap.ts) and the route revalidates once the container is
# running with a real API_URL.
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter web build

# ---------------------------------------------------------------------------
# runner -- serves `.next/standalone`, which carries only the traced modules,
# so there is no pnpm and no node_modules install here.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Repeated from the builder: this stage starts from a fresh base, so the ARG
# has to be redeclared to be readable here.
ARG FRONTEND_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3101

# FRONTEND_URL is needed at *runtime* as well, not only at build. sitemap.xml
# is ISR (revalidate 3600), so an hour after boot it regenerates through
# getSiteUrl() -- and with the variable unset that falls back to
# http://localhost:3101, rewriting every <loc> to localhost. The failure is
# silent and delayed by an hour, which is the worst shape for it to take.
#
# Seeding it from the build arg means the image is already correct with no
# operator action; Dokploy can still override it at runtime.
ENV FRONTEND_URL=$FRONTEND_URL
# Without this the standalone server binds 127.0.0.1 and is unreachable from
# outside the container -- the failure looks like a dead app rather than a
# binding problem, so it is set explicitly.
ENV HOSTNAME=0.0.0.0

# `outputFileTracingRoot` is the repo root, so the standalone output mirrors
# the workspace layout: the server lands at apps/web/server.js with a shared
# node_modules beside it. Copying the tree wholesale keeps those relative
# paths intact.
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./

# Neither of these is part of the traced output -- the standalone server
# serves them if present, and silently 404s every asset if not.
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /repo/apps/web/public ./apps/web/public

USER node

EXPOSE 3101

# The home page exercises the full render path, so a container that boots but
# cannot render reports unhealthy instead of accepting traffic. It is
# prerendered and hits no external service, so this stays a liveness signal
# for the web app itself and does not go red because the API is down.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3101)+'/pt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
