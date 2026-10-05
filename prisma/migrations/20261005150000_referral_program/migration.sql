-- 2026-10-05: referral program for institutes.
--
-- Each institute gets a unique 8-char referralCode (unambiguous alphabet:
-- no 0/O, 1/I/L). New institutes registering with ?ref=CODE are linked via
-- referred_by_tenant_id. When a referred institute pays for their first
-- subscription plan, the referrer earns 30 free days (referral_reward row,
-- one per triggering payment for idempotency).

-- Tenant columns
ALTER TABLE "tenant" ADD COLUMN "referral_code" VARCHAR(8);
ALTER TABLE "tenant" ADD COLUMN "referred_by_tenant_id" CHAR(26);

-- Uniqueness for referral codes (NULLs allowed; every tenant gets one at
-- creation/backfill, so in practice there are no NULLs).
CREATE UNIQUE INDEX "tenant_referral_code_key" ON "tenant"("referral_code");

-- Self-referential FK: who referred this institute
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_referred_by_tenant_id_fkey"
  FOREIGN KEY ("referred_by_tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rewards table
CREATE TABLE "referral_reward" (
  "id" CHAR(26) NOT NULL,
  "referrer_tenant_id" CHAR(26) NOT NULL,
  "referred_tenant_id" CHAR(26) NOT NULL,
  "reward_type" TEXT NOT NULL DEFAULT 'EXTENSION_DAYS',
  "reward_days" INTEGER NOT NULL DEFAULT 30,
  "granted_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "subscription_payment_id" CHAR(26),
  CONSTRAINT "referral_reward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "referral_reward_subscription_payment_id_key" ON "referral_reward"("subscription_payment_id");
CREATE INDEX "referral_reward_referrer_tenant_id_granted_at_idx" ON "referral_reward"("referrer_tenant_id", "granted_at");

ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_referrer_tenant_id_fkey"
  FOREIGN KEY ("referrer_tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_referred_tenant_id_fkey"
  FOREIGN KEY ("referred_tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_reward" ADD CONSTRAINT "referral_reward_subscription_payment_id_fkey"
  FOREIGN KEY ("subscription_payment_id") REFERENCES "subscription_payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: tenant isolation on the referrer (the referrer sees their own rewards)
ALTER TABLE "referral_reward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_reward" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "referral_reward"
  USING (referrer_tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (referrer_tenant_id = current_setting('app.tenant_id', true));

-- Backfill: generate a unique referral code for every existing tenant.
-- Unambiguous alphabet (no 0/O, 1/I/L): 23456789ABCDEFGHJKMNPQRSTUVWXYZ.
DO $$
DECLARE
  t RECORD;
  new_code TEXT;
  alphabet TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
BEGIN
  FOR t IN SELECT id FROM "tenant" WHERE "referral_code" IS NULL LOOP
    LOOP
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substr(alphabet, (floor(random() * 32) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "tenant" WHERE "referral_code" = new_code);
    END LOOP;
    UPDATE "tenant" SET "referral_code" = new_code WHERE id = t.id;
  END LOOP;
END $$;
