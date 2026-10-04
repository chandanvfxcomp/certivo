-- Certificate table + fee fields, brought forward from the deferred
-- "Phase 2" scope by explicit user request — see the SCOPE CHANGE comment
-- at the top of prisma/schema.prisma and the Certificate model's own
-- comment for what was and wasn't brought forward.

-- Registration fee on student (nullable amount + paid flag; no gateway,
-- admin marks it paid manually — see README).
ALTER TABLE "student" ADD COLUMN "registration_fee_paise" INTEGER;
ALTER TABLE "student" ADD COLUMN "registration_fee_paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "student" ADD COLUMN "registration_fee_paid_at" TIMESTAMPTZ(3);

CREATE TYPE "certificate_status" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "certificate" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "student_id" CHAR(26) NOT NULL,
    "code" TEXT NOT NULL,
    "status" "certificate_status" NOT NULL DEFAULT 'ACTIVE',
    "student_name_snapshot" TEXT NOT NULL,
    "institute_name_snapshot" TEXT NOT NULL,
    "course_name_snapshot" TEXT NOT NULL,
    "completion_date" TIMESTAMPTZ(3),
    "issued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_reason" TEXT,
    "fee_paise" INTEGER,
    "fee_paid" BOOLEAN NOT NULL DEFAULT false,
    "fee_paid_at" TIMESTAMPTZ(3),
    "pdf_file_id" CHAR(26),
    "created_by" CHAR(26) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "certificate_code_key" ON "certificate"("code");
CREATE INDEX "certificate_tenant_id_student_id_idx" ON "certificate"("tenant_id", "student_id");

ALTER TABLE "certificate" ADD CONSTRAINT "certificate_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Grants + RLS, same tenant_isolation pattern as every other tenant-scoped
-- table (see the roles_and_rls migration's header comment).
GRANT SELECT, INSERT, UPDATE, DELETE ON "certificate" TO app_user;

ALTER TABLE "certificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certificate" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "certificate"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- certificate_public — the ONLY way the public verification page
-- (`/v/{code}`) is allowed to read certificate data. Section 11 requires
-- this to work with NO login and NO tenant context (anyone, any tenant, one
-- URL), which is fundamentally incompatible with the tenant_isolation
-- policy above (that policy requires app.tenant_id to already be set, and a
-- public visitor doesn't know — and must never need to know — which tenant
-- a code belongs to).
--
-- The fix is a dedicated view, not a second permissive RLS policy on the
-- base table: a view's underlying-table access is checked against the
-- VIEW'S OWNER, not the querying role, unless the view is explicitly
-- security_invoker (Postgres default: security_invoker = false). This
-- migration runs as `migrator`, which has BYPASSRLS, so `migrator` becomes
-- the view owner and the view can see every tenant's rows regardless of
-- app.tenant_id — but the view's column list and WHERE clause are what
-- actually make it *safe*, not the bypass:
--   - only the snapshot columns are selected — never student.email/phone/
--     address/date_of_birth/photo_file_id/guardian_name, and the view
--     doesn't even join to `student`, so there is no live path from this
--     view to that data at all;
--   - only status = 'ACTIVE' rows are visible — a revoked code correctly
--     shows as invalid, not as a stale copy of the old data.
-- app_user (the app's one DB login, used for every request) gets SELECT on
-- the view only — never on the base `certificate` columns beyond what
-- tenant_isolation already governs.
CREATE VIEW "certificate_public" AS
SELECT
  "code",
  "status",
  "student_name_snapshot"   AS "student_name",
  "institute_name_snapshot" AS "institute_name",
  "course_name_snapshot"    AS "course_name",
  "completion_date",
  "issued_at"
FROM "certificate"
WHERE "status" = 'ACTIVE';

GRANT SELECT ON "certificate_public" TO app_user;
