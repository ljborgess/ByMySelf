#!/bin/sh
# Applies pending migrations, then hands control to the API server.
#
# Issue #36, user story 3: the first production deploy must not fail on
# missing tables. Doing this in the entrypoint rather than as a Dokploy
# pre-deploy command is deliberate -- a step that lives in a panel field is a
# step someone can forget to configure, and the failure mode is the API
# answering requests against a schema that does not exist.
#
# Set RUN_MIGRATIONS_ON_START=false to opt out, for the case the issue leaves
# open: if this ever runs as more than one replica, concurrent migrators
# racing on the same database is worse than a single deliberate pre-deploy
# step, and the toggle avoids rebuilding the image to change strategy.

set -e

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  max_attempts="${MIGRATION_MAX_ATTEMPTS:-10}"

  # Validated rather than trusted. `test N -ge M` with a non-numeric operand
  # returns 2, and inside an `if` that is just "false" -- which `set -e` does
  # not catch. The bound would silently never trip and the container would
  # retry forever, looking like a hang rather than a misconfiguration.
  case "$max_attempts" in
    '' | *[!0-9]*)
      echo "entrypoint: MIGRATION_MAX_ATTEMPTS must be a positive integer, got '${max_attempts}'" >&2
      exit 1
      ;;
  esac

  if [ "$max_attempts" -lt 1 ]; then
    echo "entrypoint: MIGRATION_MAX_ATTEMPTS must be at least 1" >&2
    exit 1
  fi

  attempt=1
  while true; do
    # `set -e` would abort on a non-zero exit, so the status is captured
    # explicitly to branch on it.
    set +e
    node dist/database/migrate
    status=$?
    set -e

    if [ "$status" -eq 0 ]; then
      break
    fi

    # 75 (EX_TEMPFAIL) is the migrate script's signal for "database not
    # reachable yet" -- the normal race when Postgres and the API start
    # together. Anything else is permanent: bad SQL, invalid credentials,
    # failed env validation. Retrying those ten times before dying only
    # delays a failure a human has to fix, and with `restart: unless-stopped`
    # it turns into a slow crash loop that hides the real error.
    if [ "$status" -ne 75 ]; then
      echo "entrypoint: migrations failed permanently (exit ${status}), not retrying" >&2
      exit "$status"
    fi

    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "entrypoint: database still unreachable after ${attempt} attempts, giving up" >&2
      exit 1
    fi

    echo "entrypoint: database not ready (attempt ${attempt}/${max_attempts}), retrying in 3s" >&2
    attempt=$((attempt + 1))
    sleep 3
  done
else
  echo "entrypoint: RUN_MIGRATIONS_ON_START=false, skipping migrations"
fi

# Least privilege (#88): ensures the role in DATABASE_URL exists with only
# the grants the app uses (SELECT/INSERT/UPDATE/DELETE, no DDL). Runs after
# migrations, not before -- the GRANT on ALL TABLES only covers tables that
# already exist. Idempotent, and a no-op in the shape used by local dev
# (MIGRATION_DATABASE_URL unset, same role as DATABASE_URL), so this is safe
# to always run rather than gating it on RUN_MIGRATIONS_ON_START.
#
# No retry, unlike the migrations loop above: by the time this runs the
# database has already answered, so a failure here is permanent.
echo "entrypoint: ensuring the application role has least-privilege grants"
node dist/database/bootstrap-role

# exec so the server replaces this shell as PID 1 and receives SIGTERM from
# Dokploy directly -- otherwise the shell swallows it and the graceful
# shutdown in main.ts (app.enableShutdownHooks) never runs.
exec "$@"
