// src/server/auth/session.ts
//
// Signed, httpOnly cookie sessions for the feature-first MVP pivot — admin
// and student logins, built directly rather than through guard()'s full
// Section 8.4 shape (session -> tenant-slug match -> membership re-read ->
// tenant-status gate -> permission check -> centre scoping). That machinery
// is still the right target once real multi-institute + role/permission
// data exists; for now, with a single seeded institute (see
// scripts/seed-default-institute.ts) and exactly two roles (admin, student),
// it would be structure with nothing yet to structure. guard.ts's
// // SPEC-GAP stubs are left untouched — this file is a parallel, narrower
// path, not a silent replacement of that design.
//
// No JWT library added: a signed cookie is just HMAC-SHA256 over a JSON
// payload using Node's built-in crypto, so there's no new dependency for
// something this small (same reasoning as password.ts).
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/server/db/client";

const COOKIE_NAME = "platform_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload =
  | { kind: "admin"; userId: string; tenantId: string; membershipId: string; exp: number }
  | { kind: "student"; userId: string; studentId: string; tenantId: string; exp: number }
  | { kind: "superadmin"; userId: string; exp: number };

// Plain `Omit<SessionPayload, "exp">` looks right but silently breaks: TS
// resolves `keyof` a union type to only the keys common to EVERY member
// (here just kind/userId/tenantId), so `Omit<SessionPayload, "exp">`
// collapses to that common shape and drops `membershipId`/`studentId`
// entirely — createSessionCookie's callers would then fail to compile the
// moment this project is actually typechecked with real dependencies
// installed. Distributing the Omit over each union member first (T
// extends any ? ... : never triggers TS's union-distribution behavior)
// keeps each branch's own extra field.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loudly rather than silently signing with a weak/empty secret —
    // this must be set in .env before any login flow can work.
    throw new Error(
      "SESSION_SECRET is not set (or too short) — see .env.example. Refusing to sign sessions.",
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payloadB64);

  const sigBuf = Buffer.from(signature, "base64url");
  const expBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Server Action / Route Handler use only — sets the cookie on the response. */
export async function createSessionCookie(
  payload: DistributiveOmit<SessionPayload, "exp">,
): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const full = { ...payload, exp } as SessionPayload;
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(full), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Read + verify the current request's session, if any. Safe to call from Server Components. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export async function requireAdminSession(): Promise<Extract<SessionPayload, { kind: "admin" }>> {
  const session = await getSession();
  if (!session || session.kind !== "admin") {
    throw new Error("UNAUTHENTICATED_ADMIN");
  }
  return session;
}

export async function requireStudentSession(): Promise<Extract<SessionPayload, { kind: "student" }>> {
  const session = await getSession();
  if (!session || session.kind !== "student") {
    throw new Error("UNAUTHENTICATED_STUDENT");
  }
  return session;
}

export async function requireSuperAdminSession(): Promise<Extract<SessionPayload, { kind: "superadmin" }>> {
  const session = await getSession();
  if (!session || session.kind !== "superadmin") {
    throw new Error("UNAUTHENTICATED_SUPERADMIN");
  }
  // Belt-and-braces: the flag is checked at login, but re-verify from the
  // DB here so revoking isSuperAdmin takes effect without waiting for the
  // 7-day cookie to expire.
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isSuperAdmin || user.status !== "ACTIVE") {
    throw new Error("UNAUTHENTICATED_SUPERADMIN");
  }
  return session;
}
