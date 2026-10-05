// tests/referral.test.ts
//
// Unit tests for referral code generation/normalization.
// (Reward-grant logic is integration-tested via the subscription flow;
// these cover the pure helpers.)
import { describe, it, expect } from "vitest";
import {
  generateReferralCode,
  normalizeReferralCode,
} from "@/server/referrals/code";

const ALLOWED = new Set("23456789ABCDEFGHJKMNPQRSTUVWXYZ".split(""));

describe("generateReferralCode", () => {
  it("produces 8-char codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      expect(code).toHaveLength(8);
      for (const ch of code) expect(ALLOWED.has(ch)).toBe(true);
    }
  });

  it("never uses ambiguous characters (0/O, 1/I/L)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("generates distinct codes", () => {
    const codes = new Set(Array.from({ length: 100 }, generateReferralCode));
    expect(codes.size).toBeGreaterThan(95); // collisions ~impossible
  });
});

describe("normalizeReferralCode", () => {
  it("uppercases and trims input", () => {
    expect(normalizeReferralCode("  k7x2p9qw ")).toBe("K7X2P9QW");
  });

  it("rejects null/empty", () => {
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode(undefined)).toBeNull();
  });

  it("rejects wrong length", () => {
    expect(normalizeReferralCode("ABC123")).toBeNull();
    expect(normalizeReferralCode("ABCDEFGHI")).toBeNull();
  });

  it("rejects ambiguous characters", () => {
    expect(normalizeReferralCode("AB01CDEF")).toBeNull(); // 0, 1
    expect(normalizeReferralCode("ABOICDEF")).toBeNull(); // O, I
    expect(normalizeReferralCode("ABLKCDEF")).toBeNull(); // L
  });

  it("accepts valid codes", () => {
    expect(normalizeReferralCode("K7X2P9QW")).toBe("K7X2P9QW");
    expect(normalizeReferralCode("23456789")).toBe("23456789");
  });
});
