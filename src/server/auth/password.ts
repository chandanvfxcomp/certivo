// src/server/auth/password.ts
//
// Password hashing for the admin + student login pivot. Deliberately built
// on Node's built-in `crypto.scrypt` rather than adding bcrypt/argon2 as a
// dependency — this sandbox can't run `pnpm install` to verify a new
// package (see README), and scrypt is a well-reviewed, OWASP-recommended
// KDF already in the Node standard library, so zero new supply-chain
// surface for something this security-sensitive.
//
// Stored format: "scrypt:<saltHex>:<hashHex>" — self-describing so the
// algorithm can be changed later without breaking existing hashes.
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(plain, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, saltHex, hashHex] = parts;
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(plain, salt, expected.length)) as Buffer;
  // timingSafeEqual throws on length mismatch rather than returning false —
  // guard explicitly so a malformed stored hash can't crash a login attempt.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

// QA re-audit finding: a fixed, publicly-known scrypt hash (never a real
// password's) — used only to burn the same scrypt-derivation time as a
// real check when an admin/student account doesn't exist at all, so
// "unknown email/student code" and "known identifier, wrong password"
// take the same amount of time. Without this, loginAdmin/loginStudent
// short-circuited before ever calling verifyPassword when the account
// was missing, and scrypt is deliberately slow — a valid identifier
// measurably outlasts an invalid one, which lets an attacker enumerate
// real emails/student codes purely from response timing even though
// both cases redirect to the same "invalid" error message.
const DUMMY_HASH = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);

export async function verifyPasswordAgainstDummy(plain: string): Promise<void> {
  await verifyPassword(plain, DUMMY_HASH);
}

/**
 * A short, human-shareable temporary password for a newly-registered
 * student — shown once to the admin (no email/SMS sending wired up yet) so
 * they can hand it to the student out of band. Avoids visually ambiguous
 * characters (0/O, 1/I/l).
 *
 * QA audit finding C7: `byte % alphabet.length` is slightly biased toward
 * the lower characters whenever 256 isn't a multiple of the alphabet's
 * length (55 here) — rejection sampling (redraw any byte that would land
 * in the biased tail) removes that bias entirely, at the cost of an
 * occasional extra draw.
 */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const LENGTH = 10;
  const maxUnbiased = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < LENGTH) {
    const b = randomBytes(1)[0];
    if (b === undefined || b >= maxUnbiased) continue; // biased tail — redraw
    out += alphabet[b % alphabet.length];
  }
  return out;
}
