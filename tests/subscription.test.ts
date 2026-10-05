// tests/subscription.test.ts
//
// Subscription plan logic: pure unit tests for helpers that don't need a DB.
// - Plan feature flag parsing
// - Student limit semantics (-1 = unlimited)
// - Subscription usability rules (ACTIVE + not expired)
import { describe, it, expect } from "vitest";

// Mirror of the limit check semantics in checkStudentLimit:
// null/undefined/-1 ⇒ unlimited; otherwise current + additional > limit blocks.
function limitAllows(
  studentLimit: number | null | undefined,
  current: number,
  additional: number,
): boolean {
  if (studentLimit === undefined || studentLimit === null || studentLimit === -1) return true;
  return current + additional <= studentLimit;
}

// Mirror of the usability rule in getSubscriptionState:
// usable ⇔ status === "ACTIVE" and (no endsAt or endsAt in the future).
function isUsable(status: string, endsAt: Date | null, now: Date): boolean {
  if (status !== "ACTIVE") return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

describe("student limit enforcement", () => {
  it("unlimited (-1) never blocks", () => {
    expect(limitAllows(-1, 10000, 500)).toBe(true);
  });

  it("null/undefined plan means no cap", () => {
    expect(limitAllows(null, 5, 1)).toBe(true);
    expect(limitAllows(undefined, 5, 1)).toBe(true);
  });

  it("blocks when the batch would exceed the cap", () => {
    expect(limitAllows(100, 99, 1)).toBe(true);
    expect(limitAllows(100, 100, 1)).toBe(false);
    expect(limitAllows(100, 95, 10)).toBe(false);
  });

  it("allows exactly up to the cap", () => {
    expect(limitAllows(100, 90, 10)).toBe(true);
  });
});

describe("subscription usability", () => {
  const now = new Date("2026-10-05T00:00:00Z");
  const future = new Date("2027-10-05T00:00:00Z");
  const past = new Date("2025-10-05T00:00:00Z");

  it("ACTIVE with future endsAt is usable", () => {
    expect(isUsable("ACTIVE", future, now)).toBe(true);
  });

  it("ACTIVE with past endsAt is expired (not usable)", () => {
    expect(isUsable("ACTIVE", past, now)).toBe(false);
  });

  it("PENDING_PAYMENT / EXPIRED / SUSPENDED are never usable", () => {
    expect(isUsable("PENDING_PAYMENT", null, now)).toBe(false);
    expect(isUsable("EXPIRED", null, now)).toBe(false);
    expect(isUsable("SUSPENDED", future, now)).toBe(false);
  });
});

describe("download pricing (2026-10-05: 1 free download)", () => {
  it("documents the current policy constants", async () => {
    const { FREE_DOWNLOADS_PER_PAYMENT, PLATFORM_REDOWNLOAD_FEE_PAISE } = await import(
      "../src/config/certificate"
    );
    expect(FREE_DOWNLOADS_PER_PAYMENT).toBe(1);
    expect(PLATFORM_REDOWNLOAD_FEE_PAISE).toBe(29900);
  });
});
