-- 2026-10-04: remove the institute-set certificate fee entirely.
-- Per the user's explicit rule, money is ONLY charged on downloads
-- (2 free, then the ₹299 platform fee per download). The certificate
-- fee columns (fee_paise/fee_paid/fee_paid_at) are dropped.
ALTER TABLE "certificate" DROP COLUMN "fee_paise";
ALTER TABLE "certificate" DROP COLUMN "fee_paid";
ALTER TABLE "certificate" DROP COLUMN "fee_paid_at";
