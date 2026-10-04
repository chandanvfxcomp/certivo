-- Hand-derived from prisma/schema.prisma (Section 7.1 + 7.2), in the same
-- shape `prisma migrate dev` produces: CreateEnum, then CreateTable (no
-- inline FKs — tenant.logo_file_id <-> file_object.tenant_id are mutually
-- referential, so all FKs are added in one AddForeignKey block at the end,
-- same as Prisma's own generator does to sidestep table-creation ordering),
-- then CreateIndex, then AddForeignKey.
--
-- Written and applied by hand against local Postgres in this sandbox
-- (scripts/verify-rls.sh) because the Prisma CLI itself needs `pnpm
-- install`, which needs npm registry access this sandbox doesn't have.
-- Once `pnpm install` succeeds elsewhere, treat this file as the source of
-- truth for `prisma migrate deploy` — do not regenerate it with
-- `prisma migrate dev` unless you first confirm the diff is empty.

-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "institution_type" AS ENUM ('ACADEMY', 'COACHING', 'TRAINING_CENTER', 'SCHOOL', 'COLLEGE', 'OTHER');
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');
CREATE TYPE "tenant_role" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'STUDENT');
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "billing_period" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "record_status" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "student_status" AS ENUM ('ACTIVE', 'INACTIVE', 'COMPLETED', 'DROPPED');
CREATE TYPE "duration_unit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR', 'HOUR');
CREATE TYPE "enrollment_status" AS ENUM ('ACTIVE', 'COMPLETED', 'WITHDRAWN');
CREATE TYPE "file_purpose" AS ENUM ('TENANT_LOGO', 'STUDENT_PHOTO', 'REGISTRATION_DOC', 'SIGNATURE', 'SEAL', 'IMPORT_CSV');
CREATE TYPE "scan_status" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');
CREATE TYPE "sub_status" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL');

-- CreateTable: platform tables (7.1) -----------------------------------------

CREATE TABLE "tenant" (
    "id" CHAR(26) NOT NULL,
    "slug" TEXT NOT NULL,
    "prefix" TEXT,
    "name" TEXT NOT NULL,
    "type" "institution_type" NOT NULL,
    "status" "tenant_status" NOT NULL DEFAULT 'PENDING',
    "owner_name" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "owner_phone" TEXT NOT NULL,
    "authorized_person" TEXT,
    "website" TEXT,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "registration_type" TEXT,
    "registration_no" TEXT,
    "logo_file_id" CHAR(26),
    "primary_color" TEXT DEFAULT '#0F172A',
    "terms_accepted_at" TIMESTAMPTZ(3) NOT NULL,
    "terms_version" TEXT NOT NULL,
    "approved_at" TIMESTAMPTZ(3),
    "approved_by" CHAR(26),
    "rejected_reason" TEXT,
    "suspended_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_account" (
    "id" CHAR(26) NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(3),
    "phone" TEXT,
    "phone_verified_at" TIMESTAMPTZ(3),
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership" (
    "id" CHAR(26) NOT NULL,
    "user_id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "role" "tenant_role" NOT NULL,
    "centre_ids" TEXT[] NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'ACTIVE',
    "invited_by" CHAR(26),
    "accepted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_plan" (
    "id" CHAR(26) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB NOT NULL,
    "features" JSONB NOT NULL,
    "price_minor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billing_period" "billing_period" NOT NULL DEFAULT 'MONTHLY',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_audit_log" (
    "id" CHAR(26) NOT NULL,
    "actor_id" CHAR(26),
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" CHAR(26),
    "metadata" JSONB NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable: tenant-scoped tables (7.2) — RLS added in the next migration --

CREATE TABLE "centre" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address_line1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "head_name" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "centre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "centre_id" CHAR(26) NOT NULL,
    "user_id" CHAR(26),
    "student_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "date_of_birth" TIMESTAMPTZ(3),
    "gender" TEXT,
    "guardian_name" TEXT,
    "address_line1" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "photo_file_id" CHAR(26),
    "status" "student_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by" CHAR(26) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "deleted_by" CHAR(26),
    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_value" INTEGER,
    "duration_unit" "duration_unit",
    "centre_ids" TEXT[] NOT NULL,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "batch" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "course_id" CHAR(26) NOT NULL,
    "centre_id" CHAR(26) NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(3),
    "end_date" TIMESTAMPTZ(3),
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "batch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollment" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "student_id" CHAR(26) NOT NULL,
    "course_id" CHAR(26) NOT NULL,
    "batch_id" CHAR(26),
    "enrolled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "grade" TEXT,
    "status" "enrollment_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by" CHAR(26) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "enrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitation" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "email" TEXT NOT NULL,
    "role" "tenant_role" NOT NULL,
    "centre_ids" TEXT[] NOT NULL,
    "student_id" CHAR(26),
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_by" CHAR(26) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "file_object" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26),
    "key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "purpose" "file_purpose" NOT NULL,
    "scan_status" "scan_status" NOT NULL DEFAULT 'PENDING',
    "uploaded_by" CHAR(26) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "file_object_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "actor_id" CHAR(26),
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" CHAR(26),
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "user_id" CHAR(26) NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usage_counter" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "metric" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "usage_counter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_subscription" (
    "id" CHAR(26) NOT NULL,
    "tenant_id" CHAR(26) NOT NULL,
    "plan_id" CHAR(26) NOT NULL,
    "status" "sub_status" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(3),
    "overrides" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex -----------------------------------------------------------------

CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");
CREATE UNIQUE INDEX "tenant_prefix_key" ON "tenant"("prefix");
CREATE INDEX "tenant_status_created_at_idx" ON "tenant"("status", "created_at");

CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

CREATE UNIQUE INDEX "membership_user_id_tenant_id_key" ON "membership"("user_id", "tenant_id");
CREATE INDEX "membership_tenant_id_role_idx" ON "membership"("tenant_id", "role");

CREATE UNIQUE INDEX "subscription_plan_code_key" ON "subscription_plan"("code");

CREATE INDEX "platform_audit_log_created_at_idx" ON "platform_audit_log"("created_at");

CREATE UNIQUE INDEX "centre_tenant_id_code_key" ON "centre"("tenant_id", "code");
CREATE INDEX "centre_tenant_id_status_idx" ON "centre"("tenant_id", "status");

CREATE UNIQUE INDEX "student_tenant_id_student_code_key" ON "student"("tenant_id", "student_code");
CREATE UNIQUE INDEX "student_tenant_id_email_key" ON "student"("tenant_id", "email");
CREATE INDEX "student_tenant_id_centre_id_status_idx" ON "student"("tenant_id", "centre_id", "status");
CREATE INDEX "student_tenant_id_full_name_idx" ON "student"("tenant_id", "full_name");

CREATE UNIQUE INDEX "course_tenant_id_code_key" ON "course"("tenant_id", "code");
CREATE INDEX "course_tenant_id_status_idx" ON "course"("tenant_id", "status");

CREATE INDEX "batch_tenant_id_course_id_idx" ON "batch"("tenant_id", "course_id");

CREATE UNIQUE INDEX "enrollment_tenant_id_student_id_course_id_batch_id_key" ON "enrollment"("tenant_id", "student_id", "course_id", "batch_id");
CREATE INDEX "enrollment_tenant_id_course_id_status_idx" ON "enrollment"("tenant_id", "course_id", "status");

CREATE UNIQUE INDEX "invitation_token_hash_key" ON "invitation"("token_hash");
CREATE INDEX "invitation_tenant_id_email_idx" ON "invitation"("tenant_id", "email");

CREATE UNIQUE INDEX "file_object_key_key" ON "file_object"("key");

CREATE INDEX "audit_log_tenant_id_created_at_idx" ON "audit_log"("tenant_id", "created_at");
CREATE INDEX "audit_log_tenant_id_target_type_target_id_idx" ON "audit_log"("tenant_id", "target_type", "target_id");

CREATE INDEX "notification_tenant_id_user_id_read_at_idx" ON "notification"("tenant_id", "user_id", "read_at");

CREATE UNIQUE INDEX "usage_counter_tenant_id_metric_period_key" ON "usage_counter"("tenant_id", "metric", "period");

CREATE UNIQUE INDEX "tenant_subscription_tenant_id_key" ON "tenant_subscription"("tenant_id");

-- AddForeignKey ----------------------------------------------------------------
-- All in one block (see header note) — resolves the tenant <-> file_object
-- mutual reference without needing a deferred/circular CREATE TABLE order.

ALTER TABLE "tenant" ADD CONSTRAINT "tenant_logo_file_id_fkey" FOREIGN KEY ("logo_file_id") REFERENCES "file_object"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership" ADD CONSTRAINT "membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "centre" ADD CONSTRAINT "centre_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student" ADD CONSTRAINT "student_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student" ADD CONSTRAINT "student_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student" ADD CONSTRAINT "student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "course" ADD CONSTRAINT "course_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "batch" ADD CONSTRAINT "batch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch" ADD CONSTRAINT "batch_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch" ADD CONSTRAINT "batch_centre_id_fkey" FOREIGN KEY ("centre_id") REFERENCES "centre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "invitation" ADD CONSTRAINT "invitation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "file_object" ADD CONSTRAINT "file_object_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification" ADD CONSTRAINT "notification_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_subscription" ADD CONSTRAINT "tenant_subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription" ADD CONSTRAINT "tenant_subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
