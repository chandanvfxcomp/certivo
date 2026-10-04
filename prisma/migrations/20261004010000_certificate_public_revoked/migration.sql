-- 2026-10-04: include REVOKED certificates in certificate_public
--
-- The public verification page distinguishes "revoked" from "not found" —
-- a revoked code shows a distinct "Revoked — no longer valid" state rather
-- than a generic error. The view remains safe: it still selects only the
-- snapshot columns (no PII, no join to student), just for ACTIVE and
-- REVOKED rows now instead of ACTIVE only.
CREATE OR REPLACE VIEW "certificate_public" AS
SELECT
  "code",
  "status",
  "student_name_snapshot"   AS "student_name",
  "institute_name_snapshot" AS "institute_name",
  "course_name_snapshot"    AS "course_name",
  "completion_date",
  "issued_at"
FROM "certificate"
WHERE "status" IN ('ACTIVE', 'REVOKED');
