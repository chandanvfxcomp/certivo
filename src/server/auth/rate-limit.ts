// src/server/auth/rate-limit.ts
//
// QA audit finding C2: neither loginAdmin nor loginStudent had any
// brute-force/credential-stuffing protection at all.
//
// Security audit (2026-10-09, M-1): the previous in-memory Map limiter was
// per-serverless-instance on Vercel, so the "10 attempts / 15 min" budget
// effectively multiplied by instance count. This is now a Postgres-backed
// fixed-window limiter — one atomic UPSERT per check, so the budget is
// global across all instances. The exported interface
// (isRateLimited/resetRateLimit/getClientIp) is unchanged; call sites only
// had to add `await`.
import { headers } from "next/headers";
import { prisma } from "@/server/db/client";
import { logger } from "@/lib/logger";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_WINDOW = 10;

// Best-effort self-heal: create the bucket table if it doesn't exist yet
// (e.g. the super-admin hasn't run the 1-click migration). Idempotent and
// guarded to run at most once per process; failures are swallowed because
// the limiter must never break logins.
let tableEnsured = false;
async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  tableEnsured = true;
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "rate_limit_bucket" (
        "key" VARCHAR(191) PRIMARY KEY,
        "count" INTEGER NOT NULL DEFAULT 0,
        "window_start" TIMESTAMPTZ NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "rate_limit_bucket_window_start_idx"
        ON "rate_limit_bucket"("window_start")`;
  } catch (err) {
    logger.warn("rate_limit.ensure_table_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// Opportunistic cleanup of expired buckets — at most once per window, and
// never on the request's critical path (fire-and-forget, errors swallowed).
let lastCleanup = 0;
function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;
  prisma.$executeRaw`
    DELETE FROM "rate_limit_bucket"
    WHERE "window_start" < ${new Date(now - WINDOW_MS)}
  `.catch((err: unknown) => {
    logger.warn("rate_limit.cleanup_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Returns true if `key` has exceeded MAX_ATTEMPTS_PER_WINDOW attempts
 * within the current window, and records this attempt either way. The
 * check-and-increment is a single atomic UPSERT, so concurrent instances
 * share one global budget. Callers should build `key` from something that
 * identifies the actual attacker surface (e.g.
 * `${ip}:${normalizedIdentifier}`), not just the identifier alone, so one
 * person mistyping their own password repeatedly doesn't get lumped in
 * with an attacker hammering many accounts from one IP — both are still
 * bounded, just under separate keys.
 *
 * Fail-open: if the database is unreachable, the attempt is allowed and a
 * warning is logged. A rate limiter must never be the thing that takes
 * logins down.
 */
export async function isRateLimited(key: string): Promise<boolean> {
  await ensureTable();
  maybeCleanup();
  const windowCutoff = new Date(Date.now() - WINDOW_MS);
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "rate_limit_bucket" ("key", "count", "window_start", "updated_at")
      VALUES (${key}, 1, NOW(), NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "rate_limit_bucket"."window_start" < ${windowCutoff} THEN 1
          ELSE "rate_limit_bucket"."count" + 1
        END,
        "window_start" = CASE
          WHEN "rate_limit_bucket"."window_start" < ${windowCutoff} THEN NOW()
          ELSE "rate_limit_bucket"."window_start"
        END,
        "updated_at" = NOW()
      RETURNING "count"`;
    const count = Number(rows[0]?.count ?? 1);
    return count > MAX_ATTEMPTS_PER_WINDOW;
  } catch (err) {
    logger.warn("rate_limit.check_failed_open", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Call after a successful login so a legitimate user isn't penalized by earlier typos. */
export async function resetRateLimit(key: string): Promise<void> {
  await ensureTable();
  try {
    await prisma.$executeRaw`DELETE FROM "rate_limit_bucket" WHERE "key" = ${key}`;
  } catch (err) {
    logger.warn("rate_limit.reset_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Best-effort client IP for rate-limit keys, read from the standard proxy
 * headers. Server Actions run in a request context, so `headers()` is
 * available here the same way it is in Route Handlers/Server Components.
 * Falls back to a constant when nothing is present (e.g. local dev with
 * no proxy in front) — attempts still get bucketed together in that case,
 * which is the safe direction to fail in for a rate limiter.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") ?? "unknown";
}
