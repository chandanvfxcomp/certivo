// src/server/referrals/code.ts
//
// Referral code generation — 8-char alphanumeric, unambiguous alphabet
// (no 0/O, 1/I/L so codes survive being read aloud or retyped).
import { prisma } from "@/server/db/client";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

export function generateReferralCode(): string {
  let code = "";
  // crypto.getRandomValues is available in Node 19+ and edge runtimes.
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  }
  return code;
}

/** Normalize user-supplied codes (query param / form field). */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(code)) return null;
  return code;
}

/**
 * Generate a code guaranteed unique in the tenant table. Retries on
 * collision (astronomically unlikely with 32^8 space, but cheap to check).
 */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const existing = await prisma.tenant.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique referral code");
}
