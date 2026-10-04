#!/usr/bin/env bash
# One-time local-dev bootstrap: creates the two Postgres roles from spec
# Section 6.3 (`app_user` — RLS-enforced, used by the app; `migrator` —
# BYPASSRLS, used only by `prisma migrate`) and a `platform_dev` database
# owned by `migrator`. Run once, as a Postgres superuser, against a fresh
# local Postgres instance. Idempotent — safe to re-run.
#
# Production (Neon): don't run this script there. Create the equivalent
# two roles + database through the Neon dashboard/CLI instead, matching the
# same privilege split, then point DATABASE_URL/DIRECT_URL at them.
set -euo pipefail

APP_USER_PASSWORD="${APP_USER_PASSWORD:-app_user_dev_password}"
MIGRATOR_PASSWORD="${MIGRATOR_PASSWORD:-migrator_dev_password}"

# Two ways to reach the Postgres superuser, depending on where this runs:
#   - This sandbox / a plain local install: Postgres runs as a local OS
#     process, and pg_hba.conf only allows password-less "peer" auth over
#     the unix socket (matched by OS username) — so we go through the
#     `postgres` OS user via sudo.
#   - CI (GitHub Actions `services: postgres:16`): Postgres is a sibling
#     *service container*, reachable only over TCP as the `postgres` role
#     with the password the service was started with — there's no shared
#     OS user to peer-auth as.
# `CI=true` is set automatically by GitHub Actions; that's the switch.
if [ "${CI:-}" = "true" ]; then
  PSQL="psql -v ON_ERROR_STOP=1 -h ${PGHOST:-localhost} -U postgres"
  export PGPASSWORD="${PGPASSWORD:-postgres}"
else
  PSQL="sudo -u postgres psql -v ON_ERROR_STOP=1"
fi

$PSQL <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD '${APP_USER_PASSWORD}';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'migrator') THEN
    CREATE ROLE migrator LOGIN PASSWORD '${MIGRATOR_PASSWORD}' BYPASSRLS CREATEDB;
  END IF;
END
\$\$;
SQL

# Database owned by migrator, so `prisma migrate` (connecting as migrator
# via DIRECT_URL) can create/alter objects without extra grants.
if ! $PSQL -tAc "SELECT 1 FROM pg_database WHERE datname = 'platform_dev'" | grep -q 1; then
  $PSQL -c "CREATE DATABASE platform_dev OWNER migrator;"
fi

echo "app_user and migrator roles ready. Database platform_dev owned by migrator."
echo "Set DATABASE_URL to connect as app_user, DIRECT_URL as migrator (see .env.example)."
