// src/server/auth/rate-limit.ts
//
// QA audit finding C2: neither loginAdmin nor loginStudent had any
// brute-force/credential-stuffing protection at all. This is a minimal,
// dependency-free, in-memory fixed-window limiter — good enough to blunt
// naive automated guessing against a single running instance, which is
// this app's whole deployment shape today (see .env.example — one
// Postgres, no queue/cache infra yet).
//
// Deliberately NOT a distributed limiter: the moment this app runs behind
// a load balancer with multiple instances, replace the Map below with a
// shared store (Redis, or a Postgres table) behind the same
// isRateLimited()/resetRateLimit() interface — every call site here stays
// unchanged.
import { headers } from "next/headers";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_WINDOW = 10;

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// Prevents the Map from growing unbounded on a long-running process —
// this is routine housekeeping, not on any request's hot path.
const cleanupTimer = setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
    }
  },
  WINDOW_MS,
);
// Don't hold the process open just for this timer (matters for scripts /
// serverless — no-op in environments without `unref`, e.g. some edge runtimes).
cleanupTimer.unref?.();

/**
 * Returns true if `key` has exceeded MAX_ATTEMPTS_PER_WINDOW attempts
 * within the current window, and records this attempt either way. Callers
 * should build `key` from something that identifies the actual attacker
 * surface (e.g. `${ip}:${normalizedIdentifier}`), not just the identifier
 * alone, so one person mistyping their own password repeatedly doesn't
 * get lumped in with an attacker hammering many accounts from one IP —
 * both are still bounded, just under separate keys.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_ATTEMPTS_PER_WINDOW;
}

/** Call after a successful login so a legitimate user isn't penalized by earlier typos. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
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
