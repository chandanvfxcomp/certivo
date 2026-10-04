-- 2026-10-04: opt-in public certificate directory
--
-- Students can opt in to a public, searchable directory of certificates
-- (name + course + institute + verify link). Opt-IN, not opt-out: the
-- default is false, and the directory view only exposes the same safe
-- snapshot columns as certificate_public. No RLS change needed.
ALTER TABLE "certificate" ADD COLUMN "directory_opt_in" BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW "certificate_directory" AS
SELECT
  "code",
  "student_name_snapshot"   AS "student_name",
  "institute_name_snapshot" AS "institute_name",
  "course_name_snapshot"    AS "course_name",
  "completion_date",
  "issued_at"
FROM "certificate"
WHERE "status" = 'ACTIVE'
  AND "directory_opt_in" = true;

GRANT SELECT ON "certificate_directory" TO app_user;
