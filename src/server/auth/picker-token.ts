// src/server/auth/picker-token.ts
//
// Security (audit 2026-10-09, L-1): the admin tenant picker used to accept a
// raw `?email=` query param, letting anyone enumerate an email's institutes
// without proving the password. The picker link now carries a short-lived
// HMAC-signed token, minted only after a successful password check in
// loginAdmin.
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 10 * 60; // 10 minutes — enough to pick a tenant

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is not set (or too short) — refusing to mint picker tokens.",
    );
  }
  return secret;
}

function sign(payloadB64: string): string {
  // Domain-separated from session cookies so the two token kinds can't be confused.
  return createHmac("sha256", getSecret()).update(`picker:${payloadB64}`).digest("base64url");
}

/** Mint a picker token for `email`. Call only after the password was verified. */
export function createPickerToken(email: string): string {
  const payloadB64 = Buffer.from(
    JSON.stringify({
      e: email.toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
  ).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Returns the verified email, or null when the token is missing, invalid, or expired. */
export function verifyPickerToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payloadB64);
  const a = Buffer.from(signature, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      e?: unknown;
      exp?: unknown;
    };
    if (typeof payload.e !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now() / 1000) return null;
    return payload.e;
  } catch {
    return null;
  }
}
