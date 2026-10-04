-- Grants + Row Level Security for the two-role model (spec Section 6.2/6.3).
--
-- The `app_user` and `migrator` ROLEs themselves are NOT created here —
-- roles are cluster-level objects and `migrator` has to already exist and
-- be authenticated *before* any migration (including this one) can run, so
-- role creation is a one-time bootstrap step: scripts/setup-db-roles.sh
-- (local dev) or the Neon dashboard / equivalent `CREATE ROLE` run once by
-- a superuser (production). This migration only grants privileges to a
-- role that's assumed to already exist, and adds RLS.
--
-- `app_user` is the sole runtime role the Next.js app connects as (both for
-- platform-table reads like the Super Admin console, and for tenant-scoped
-- data via withTenant()) — so it needs ordinary DML on every table.
-- `migrator` (BYPASSRLS, used only by `prisma migrate`) needs no grants
-- here: it owns the tables it just created.

GRANT USAGE ON SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "tenant",
  "user_account",
  "membership",
  "subscription_plan",
  "platform_audit_log",
  "centre",
  "student",
  "course",
  "batch",
  "enrollment",
  "invitation",
  "file_object",
  "audit_log",
  "notification",
  "usage_counter",
  "tenant_subscription"
TO app_user;

-- Row Level Security ----------------------------------------------------------
-- Every tenant-scoped table (spec Section 6.2, including the ones "people
-- forget": audit_log, notification, file_object, invitation, usage_counter)
-- gets ENABLE + FORCE (so even the table owner is subject to it) and a
-- tenant_isolation policy keyed on the transaction-local
-- app.tenant_id session variable that withTenant() sets — Section 6.3's
-- exact pattern, repeated per table.
--
-- NOTE on file_object: tenant_id is nullable (platform-level files, e.g. a
-- future default logo, have tenant_id = NULL). Under this policy, rows
-- with tenant_id IS NULL are invisible to app_user regardless of
-- app.tenant_id, because `NULL = current_setting(...)` is NULL, not true.
-- That's intentional least-privilege for Phase 1 (no feature reads
-- platform-level files yet) — not a bug, but worth knowing if a later
-- phase needs that path.

ALTER TABLE "centre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "centre" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "centre"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "student"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "course"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "batch" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "batch"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "enrollment"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invitation"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "file_object" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "file_object" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "file_object"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_log"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notification"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "usage_counter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_counter" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "usage_counter"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

ALTER TABLE "tenant_subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_subscription"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Platform-level tables (tenant, user_account, membership, subscription_plan,
-- platform_audit_log) intentionally get NO tenant_isolation policy — they
-- aren't tenant-scoped. Access to them is controlled at the application
-- layer (SUPER_ADMIN checks in guard()), per spec Section 6.3's
-- platform-table carve-out.

-- Append-only audit logs (spec Section 4.6 / 12.3) --------------------------
-- Enforced at the database level, not just in application code.

REVOKE UPDATE, DELETE ON "audit_log" FROM app_user;
REVOKE UPDATE, DELETE ON "platform_audit_log" FROM app_user;
