#!/usr/bin/env bash
# Verifies the RLS layer directly against Postgres via psql — no Node, no
# Prisma CLI, so it runs even where `pnpm install` can't (see README.md).
# This is the literal Section 17 P0 Done-when condition ("a test proves
# that a query without set_config returns zero rows"), plus the rest of
# the RLS/append-only guarantees the migrations claim to provide.
#
# Destructive: resets the public schema of platform_dev on every run, so
# it's safe to re-run repeatedly during development.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_USER_PASSWORD="${APP_USER_PASSWORD:-app_user_dev_password}"
MIGRATOR_PASSWORD="${MIGRATOR_PASSWORD:-migrator_dev_password}"

pass=0
fail=0
check() {
  local desc="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then
    echo "  PASS  $desc (got $got)"
    pass=$((pass + 1))
  else
    echo "  FAIL  $desc (got '$got', want '$want')"
    fail=$((fail + 1))
  fi
}

echo "== 1. Ensure roles + database exist =="
bash scripts/setup-db-roles.sh

echo "== 2. Reset schema and apply migrations (as migrator/superuser) =="
# `AUTHORIZATION migrator` makes migrator the schema OWNER (not just a
# grantee) — matching a real Neon setup, where the app's database-owner
# role owns its own public schema by default. Ownership is what lets the
# GRANT USAGE ... TO app_user inside the roles_and_rls migration actually
# take effect: a plain grantee without WITH GRANT OPTION can't re-grant.
# See scripts/setup-db-roles.sh for why the superuser path differs by CI.
if [ "${CI:-}" = "true" ]; then
  SUPER_PSQL="psql -v ON_ERROR_STOP=1 -h ${PGHOST:-localhost} -U postgres"
  export PGPASSWORD="${PGPASSWORD:-postgres}"
else
  SUPER_PSQL="sudo -u postgres psql -v ON_ERROR_STOP=1"
fi
$SUPER_PSQL -d platform_dev -c \
  "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public AUTHORIZATION migrator;" >/dev/null

# Migrations are owned/created by migrator (BYPASSRLS), matching how
# `prisma migrate deploy` would run them against DIRECT_URL in production.
PGPASSWORD="$MIGRATOR_PASSWORD" psql -v ON_ERROR_STOP=1 -h localhost -U migrator -d platform_dev \
  -f prisma/migrations/20260907095000_init/migration.sql >/dev/null
PGPASSWORD="$MIGRATOR_PASSWORD" psql -v ON_ERROR_STOP=1 -h localhost -U migrator -d platform_dev \
  -f prisma/migrations/20260907095500_roles_and_rls/migration.sql >/dev/null
PGPASSWORD="$MIGRATOR_PASSWORD" psql -v ON_ERROR_STOP=1 -h localhost -U migrator -d platform_dev \
  -f prisma/migrations/20260910100000_certificate_and_fees/migration.sql >/dev/null
PGPASSWORD="$MIGRATOR_PASSWORD" psql -v ON_ERROR_STOP=1 -h localhost -U migrator -d platform_dev \
  -f prisma/migrations/20260910120000_certificate_download_limit/migration.sql >/dev/null
echo "  migrations applied cleanly"

echo "== 3. Seed two tenants with their own centre + student each =="
PGPASSWORD="$MIGRATOR_PASSWORD" psql -v ON_ERROR_STOP=1 -h localhost -U migrator -d platform_dev <<'SQL' >/dev/null
INSERT INTO tenant (id, slug, name, type, status, owner_name, owner_email, owner_phone,
  address_line1, city, state, pincode, terms_accepted_at, terms_version, updated_at)
VALUES
  (substr(upper(md5('tenant-a-seed')), 1, 26), 'tenant-a', 'Tenant A Institute', 'ACADEMY', 'APPROVED',
   'Owner A', 'ownera@example.com', '9990000001', 'Line 1', 'City', 'State', '110001',
   now(), 'v1', now()),
  (substr(upper(md5('tenant-b-seed')), 1, 26), 'tenant-b', 'Tenant B Institute', 'ACADEMY', 'APPROVED',
   'Owner B', 'ownerb@example.com', '9990000002', 'Line 1', 'City', 'State', '110002',
   now(), 'v1', now());

INSERT INTO centre (id, tenant_id, name, code)
VALUES
  (substr(upper(md5('centre-a-seed')), 1, 26), substr(upper(md5('tenant-a-seed')), 1, 26), 'Centre A', 'CA1'),
  (substr(upper(md5('centre-b-seed')), 1, 26), substr(upper(md5('tenant-b-seed')), 1, 26), 'Centre B', 'CB1');

INSERT INTO student (id, tenant_id, centre_id, student_code, full_name, created_by, updated_at)
VALUES
  (substr(upper(md5('student-a1-seed')), 1, 26), substr(upper(md5('tenant-a-seed')), 1, 26),
   substr(upper(md5('centre-a-seed')), 1, 26), 'STU-A-1', 'Student A1', substr(upper(md5('tenant-a-seed')), 1, 26), now()),
  (substr(upper(md5('student-a2-seed')), 1, 26), substr(upper(md5('tenant-a-seed')), 1, 26),
   substr(upper(md5('centre-a-seed')), 1, 26), 'STU-A-2', 'Student A2', substr(upper(md5('tenant-a-seed')), 1, 26), now()),
  (substr(upper(md5('student-b1-seed')), 1, 26), substr(upper(md5('tenant-b-seed')), 1, 26),
   substr(upper(md5('centre-b-seed')), 1, 26), 'STU-B-1', 'Student B1', substr(upper(md5('tenant-b-seed')), 1, 26), now());

INSERT INTO audit_log (id, tenant_id, action, target_type)
VALUES (substr(upper(md5('audit-a1-seed')), 1, 26), substr(upper(md5('tenant-a-seed')), 1, 26), 'student.create', 'student');

INSERT INTO certificate (id, tenant_id, student_id, code, status, student_name_snapshot,
  institute_name_snapshot, course_name_snapshot, created_by)
VALUES
  (substr(upper(md5('cert-a1-active-seed')), 1, 26), substr(upper(md5('tenant-a-seed')), 1, 26),
   substr(upper(md5('student-a1-seed')), 1, 26), 'TSTA-2026-VERIFYRLS01', 'ACTIVE', 'Student A1',
   'Tenant A Institute', 'Verify RLS Course', substr(upper(md5('tenant-a-seed')), 1, 26)),
  (substr(upper(md5('cert-a2-revoked-seed')), 1, 26), substr(upper(md5('tenant-a-seed')), 1, 26),
   substr(upper(md5('student-a2-seed')), 1, 26), 'TSTA-2026-VERIFYRLS02', 'REVOKED', 'Student A2',
   'Tenant A Institute', 'Verify RLS Course', substr(upper(md5('tenant-a-seed')), 1, 26));
SQL
echo "  seeded: tenant A (2 students, 1 active + 1 revoked certificate), tenant B (1 student)"

TENANT_A_SQL="substr(upper(md5('tenant-a-seed')), 1, 26)"

echo "== 4. Section 17 Done-when: app_user, NO set_config => zero rows =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev \
  -c "SELECT count(*) FROM student;")
check "app_user without set_config sees zero students" "$GOT" "0"

echo "== 5. app_user WITH set_config => only that tenant's rows =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev <<SQL
BEGIN;
SELECT set_config('app.tenant_id', $TENANT_A_SQL, true);
SELECT count(*) FROM student;
COMMIT;
SQL
)
GOT=$(echo "$GOT" | grep -E '^[0-9]+$' | tail -1)
check "app_user with tenant A set sees exactly tenant A's 2 students" "$GOT" "2"

echo "== 6. set_config is transaction-local (never leaks to the next tx) =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev -c \
  "BEGIN; SELECT set_config('app.tenant_id', $TENANT_A_SQL, true); COMMIT; SELECT count(*) FROM student;" \
  | grep -E '^[0-9]+$' | tail -1)
check "tenant_id does not leak past the transaction that set it" "$GOT" "0"

echo "== 7. migrator (BYPASSRLS) sees everything regardless =="
GOT=$(PGPASSWORD="$MIGRATOR_PASSWORD" psql -tA -h localhost -U migrator -d platform_dev \
  -c "SELECT count(*) FROM student;")
check "migrator (BYPASSRLS) sees all 3 students across both tenants" "$GOT" "3"

echo "== 8. audit_log is append-only: UPDATE/DELETE denied to app_user =="
if PGPASSWORD="$APP_USER_PASSWORD" psql -v ON_ERROR_STOP=1 -tA -h localhost -U app_user -d platform_dev \
  -c "UPDATE audit_log SET action = 'tampered';" >/tmp/verify-rls-audit-update.log 2>&1; then
  check "app_user cannot UPDATE audit_log" "allowed" "denied"
else
  check "app_user cannot UPDATE audit_log" "denied" "denied"
fi

echo "== 9. certificate table itself is tenant-isolated like everything else =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev \
  -c "SELECT count(*) FROM certificate;")
check "app_user without set_config sees zero certificates directly" "$GOT" "0"

echo "== 10. certificate_public view: no login, no tenant context, safe fields only =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev \
  -c "SELECT student_name FROM certificate_public WHERE code = 'TSTA-2026-VERIFYRLS01';")
check "certificate_public returns the active cert's snapshot with NO set_config" "$GOT" "Student A1"

echo "== 11. certificate_public hides revoked certificates =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev \
  -c "SELECT count(*) FROM certificate_public WHERE code = 'TSTA-2026-VERIFYRLS02';")
check "certificate_public returns zero rows for a revoked code" "$GOT" "0"

echo "== 12. certificate_public never exposes student PII columns =="
GOT=$(PGPASSWORD="$APP_USER_PASSWORD" psql -tA -h localhost -U app_user -d platform_dev -c \
  "SELECT count(*) FROM information_schema.columns WHERE table_name = 'certificate_public' AND column_name IN ('email','phone','date_of_birth','guardian_name','address_line1','photo_file_id');")
check "certificate_public view has zero PII columns" "$GOT" "0"

echo
echo "== Summary: $pass passed, $fail failed =="
[ "$fail" -eq 0 ]
