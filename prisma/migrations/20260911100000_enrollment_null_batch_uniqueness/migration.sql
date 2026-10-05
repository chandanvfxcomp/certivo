-- QA audit finding B3: enrollment's compound unique constraint
-- (tenant_id, student_id, course_id, batch_id) does NOT prevent duplicate
-- enrollments when batch_id is NULL — Postgres treats every NULL as
-- distinct from every other NULL for uniqueness purposes, so two rows
-- with the same tenant/student/course and a NULL batch both pass the
-- plain UNIQUE constraint. Verified locally before writing this file:
--
--   old constraint, batch_id NULL both rows -> both INSERTs succeed (bug)
--   after this migration                    -> second INSERT correctly
--                                               raises a unique violation
--
-- Fix: replace the single UNIQUE constraint with two partial unique
-- indexes — Prisma's schema DSL has no `WHERE` clause for @@unique, so
-- this constraint is intentionally NOT representable in schema.prisma;
-- see the comment above the Enrollment model there.
--   1. one row per (tenant, student, course, batch) when batch_id IS SET
--   2. one row per (tenant, student, course) when batch_id IS NULL
--      (a student can't have two un-batched enrollments in the same
--      course; they'd need distinct batches to enroll more than once)
--
-- LOW severity / currently unreachable: Course/Batch/Enrollment are
-- schema-only today — no app code creates an Enrollment row yet — so
-- this closes the gap before that feature ships rather than in response
-- to any live data. Not run against a real database from this sandbox
-- (no `prisma migrate dev` — see README); the SQL was however syntax-
-- and behavior-verified against a local scratch Postgres 16 database in
-- this environment before being committed here.
-- Note: the original was created via CREATE UNIQUE INDEX (see the init
-- migration), not as a table constraint, so it must be dropped with
-- DROP INDEX — ALTER TABLE ... DROP CONSTRAINT cannot see it.
DROP INDEX "enrollment_tenant_id_student_id_course_id_batch_id_key";

CREATE UNIQUE INDEX "enrollment_tenant_student_course_batch_key"
  ON "enrollment" ("tenant_id", "student_id", "course_id", "batch_id")
  WHERE "batch_id" IS NOT NULL;

CREATE UNIQUE INDEX "enrollment_tenant_student_course_no_batch_key"
  ON "enrollment" ("tenant_id", "student_id", "course_id")
  WHERE "batch_id" IS NULL;
