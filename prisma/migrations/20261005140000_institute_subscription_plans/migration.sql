-- 2026-10-05: institute subscription plans.
--
-- Institutes must hold an ACTIVE paid plan to use the admin console.
-- New tables: plan (yearly plans with student limits + feature flags),
-- subscription_payment (per-payment audit trail, tenant-scoped with RLS).
-- Tenant gains: plan_id, subscription_status, subscription_ends_at.
-- Seeds the 3 default plans: Starter ₹999/yr/100 students, Professional
-- ₹2,999/yr/500 students, Enterprise ₹4,999/yr/unlimited.

-- New tables
CREATE TABLE "plan" (
  "id" CHAR(26) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_paise" INTEGER NOT NULL,
  "student_limit" INTEGER NOT NULL,
  "features" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_payment" (
  "id" CHAR(26) NOT NULL,
  "tenant_id" CHAR(26) NOT NULL,
  "plan_id" CHAR(26) NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_order_id" TEXT,
  "provider_payment_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "subscription_payment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "subscription_payment_tenant_id_created_at_idx" ON "subscription_payment"("tenant_id", "created_at");

-- Tenant columns
ALTER TABLE "tenant" ADD COLUMN "plan_id" CHAR(26);
ALTER TABLE "tenant" ADD COLUMN "subscription_status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE "tenant" ADD COLUMN "subscription_ends_at" TIMESTAMPTZ;

-- Foreign keys
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: tenant isolation (same pattern as other tenant tables)
ALTER TABLE "subscription_payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_payment" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subscription_payment"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Seed the 3 default plans (fixed ULIDs so they're stable across environments)
INSERT INTO "plan" ("id", "name", "description", "price_paise", "student_limit", "features", "is_active", "sort_order")
VALUES
  ('01K7QZV1STARTER00000000001', 'Starter', 'For small coaching centres getting started with digital certificates.', 99900, 100,
   '{"bulkIssuance": true, "analytics": true, "allTemplates": false, "whiteLabel": false}',
   true, 1),
  ('01K7QZV1PROF00000000000002', 'Professional', 'For growing institutes that need premium templates and more students.', 299900, 500,
   '{"bulkIssuance": true, "analytics": true, "allTemplates": true, "whiteLabel": false}',
   true, 2),
  ('01K7QZV1ENTERPRISE00000003', 'Enterprise', 'Unlimited students and full white-label branding for large institutes.', 499900, -1,
   '{"bulkIssuance": true, "analytics": true, "allTemplates": true, "whiteLabel": true}',
   true, 3)
ON CONFLICT ("id") DO NOTHING;
