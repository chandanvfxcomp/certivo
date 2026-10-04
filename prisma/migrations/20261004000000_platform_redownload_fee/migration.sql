-- 2026-10-04: platform re-download fee
--
-- Per the user's explicit instruction: a student gets FREE_DOWNLOADS_PER_PAYMENT
-- downloads per payment cycle. Once that allowance is exhausted, a fixed
-- platform fee of ₹299 (PLATFORM_REDOWNLOAD_FEE_PAISE in src/config/certificate.ts)
-- unlocks the next allowance — this is the platform's revenue, separate from
-- any institute-set certificate fee (fee_paise), which remains a one-time
-- initial unlock. No RLS change needed — these columns live on the
-- already-RLS-covered `certificate` table and carry no new access path.
ALTER TABLE "certificate" ADD COLUMN "platform_fee_paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "certificate" ADD COLUMN "platform_fee_paid_at" TIMESTAMPTZ;
