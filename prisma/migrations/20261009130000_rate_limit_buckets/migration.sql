-- 2026-10-09: shared rate-limit buckets (security audit M-1).
--
-- The in-memory Map rate limiter was per-serverless-instance on Vercel,
-- so the "10 attempts / 15 min" budget effectively multiplied by instance
-- count. This table backs the fixed-window limiter globally, behind the
-- same isRateLimited()/resetRateLimit() interface. The app writes via
-- atomic upserts in src/server/auth/rate-limit.ts (no Prisma model API
-- needed on the hot path).

CREATE TABLE IF NOT EXISTS "rate_limit_bucket" (
  "key" VARCHAR(191) PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0,
  "window_start" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "rate_limit_bucket_window_start_idx"
  ON "rate_limit_bucket"("window_start");
