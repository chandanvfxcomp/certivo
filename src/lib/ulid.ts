// src/lib/ulid.ts
//
// Minimal ULID generator — every primary key in this schema is a
// CHAR(26) ULID (spec's frozen contract, Section 4). Hand-written rather
// than adding the `ulid` package: it's ~30 lines, the spec, algorithm is
// public and stable (Crockford Base32, 48-bit timestamp + 80-bit
// randomness), and P0 had no mutations yet so this was never needed until
// now — same "no new dependency where the stdlib + a short, reviewable
// implementation suffice" reasoning as password.ts/session.ts.
import { randomBytes } from "node:crypto";

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford Base32, no I/L/O/U
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number): string {
  let mut = now;
  let str = "";
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    const mod = mut % ENCODING_LEN;
    str = ENCODING.charAt(mod) + str;
    mut = (mut - mod) / ENCODING_LEN;
  }
  return str;
}

function encodeRandom(): string {
  const bytes = randomBytes(RANDOM_LEN);
  let str = "";
  for (let i = 0; i < RANDOM_LEN; i++) {
    str += ENCODING.charAt(bytes[i]! % ENCODING_LEN);
  }
  return str;
}

/** A new ULID: 26 Crockford-Base32 characters, lexicographically sortable by time. */
export function ulid(): string {
  return encodeTime(Date.now()) + encodeRandom();
}

/** Random Crockford-Base32 string of the given length — used for the credential code's RANDOM10 segment. */
export function randomBase32(length: number): string {
  const bytes = randomBytes(length);
  let str = "";
  for (let i = 0; i < length; i++) {
    str += ENCODING.charAt(bytes[i]! % ENCODING_LEN);
  }
  return str;
}
