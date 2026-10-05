-- 2026-10-04: expose grade/mode on the public verification view.
-- Both are printed on the certificate (MODE / GRADE row of the template),
-- so the verification page shows the same facts. Still snapshot-only, no
-- PII, no join to student.
--
-- NOTE: DROP + CREATE (not CREATE OR REPLACE) — the column list changes
-- (grade/mode added before issued_at), and Postgres refuses to rename view
-- columns positionally via OR REPLACE.
DROP VIEW IF EXISTS "certificate_public";
CREATE VIEW "certificate_public" AS
SELECT
  "code",
  "status",
  "student_name_snapshot"   AS "student_name",
  "institute_name_snapshot" AS "institute_name",
  "course_name_snapshot"    AS "course_name",
  "completion_date",
  "grade",
  "mode",
  "issued_at"
FROM "certificate"
WHERE "status" IN ('ACTIVE', 'REVOKED');
