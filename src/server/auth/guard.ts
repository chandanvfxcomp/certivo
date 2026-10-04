// src/server/auth/guard.ts
//
// guard() — the core authorization rule (spec Section 8.4): "Never trust
// the client for identity, tenant, role, or object ownership." Every
// server action / mutation calls this first.
//
// P0 status: this is a SHAPE, not a working implementation. Steps 1-3 and
// 5 depend on pieces that don't exist yet — Better Auth sessions (P1),
// the tenant/membership lookups and the Section 5.2 permission matrix
// (P3). Each depends on later phases and is marked
// `// SPEC-GAP: implemented in P1/P3` below, throwing rather than silently
// no-op-ing, so a stray early call fails loudly instead of pretending to
// authorize something. The point of writing this now is so P1/P3 slot
// their real implementations into a shape that's already fixed and
// reviewed, instead of guard() itself being redesigned later.
//
// Step 6 (centre scoping for STAFF) is left in the same conditional shape
// the spec shows, but its body can't run until step 3's real membership
// lookup exists — same SPEC-GAP.
//
// 2026-09-10 update: the feature-first MVP pivot needed *some* working
// admin/student auth now, well before Better Auth (P1) or the Section 5.2
// permission matrix (P3) exist. Rather than half-implement this function
// against infrastructure that isn't there, src/server/auth/session.ts adds
// a narrower, parallel path (signed cookie sessions, requireAdminSession()/
// requireStudentSession()) built directly against the single seeded
// tenant + two roles this MVP actually has. guard() itself is untouched —
// still the target shape once real multi-tenant/multi-role data exists to
// fill steps 1/3/5 in for real.
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

// SPEC-GAP: placeholder shape. Replace with the full permission enum
// derived from the Section 5.2 role/permission matrix when P3 builds it
// (e.g. "student.create" | "course.edit" | "credential.issue" | ...).
// Kept as a branded string (not `string`) so callers can't pass an
// arbitrary literal once the real union lands — every existing call site
// will be forced to update.
export type Permission = string & { readonly __brand: "Permission" };

export interface Session {
  userId: string;
  activeTenantId: string | null;
}

export interface Membership {
  userId: string;
  tenantId: string;
  role: "OWNER" | "ADMIN" | "STAFF" | "STUDENT";
  centreIds: string[];
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
}

export interface Tenant {
  id: string;
  slug: string;
}

export interface GuardOptions {
  permission: Permission;
  tenantSlug?: string;
  centreId?: string;
}

export interface GuardResult {
  session: Session;
  tenantId: string;
  membership: Membership;
}

// --- Dependencies guard() needs, none of which exist yet --------------------

// SPEC-GAP: implemented in P1 (Better Auth session reading from the
// request cookie — never a header, body, or query param, per spec 8.4
// step 1).
async function getSession(): Promise<Session | null> {
  throw new Error(
    "getSession() not implemented — Better Auth sessions land in P1",
  );
}

// SPEC-GAP: implemented in P2/P3 (tenant repo — reads Tenant by slug).
async function getTenantBySlug(_slug: string): Promise<Tenant | null> {
  throw new Error(
    "getTenantBySlug() not implemented — tenant repo lands in P2/P3",
  );
}

// SPEC-GAP: implemented in P3 (membership repo — always re-read from the
// database, never trusted from the session/cookie, per spec 8.4 step 3).
async function getMembership(
  _userId: string,
  _tenantId: string,
): Promise<Membership | null> {
  throw new Error(
    "getMembership() not implemented — membership repo lands in P3",
  );
}

// SPEC-GAP: implemented in P3 (the Section 5.2 permission matrix, as a
// pure function of role -> allowed permissions).
function can(_role: Membership["role"], _permission: Permission): boolean {
  throw new Error(
    "can() not implemented — Section 5.2 permission matrix lands in P3",
  );
}

/**
 * Logs a security-relevant denial (tenant/session mismatch, forged tenant
 * id, etc.) — this one IS implemented now; it doesn't depend on anything
 * unbuilt. Writes to the structured logger; wiring it into a persisted
 * AuditLog/PlatformAuditLog row is P2+ (once services/audit.ts exists).
 */
async function logSecurityEvent(
  event: string,
  details: Record<string, unknown>,
): Promise<void> {
  logger.warn(`security_event:${event}`, details);
}

// --- guard() ------------------------------------------------------------

export async function guard(opts: GuardOptions): Promise<GuardResult> {
  // 1. Session from cookie. Not from a header, body, or query param.
  const session = await getSession();
  if (!session) throw new UnauthorizedError();

  // 2. Resolve tenant from the SESSION, then assert it matches the URL
  //    slug. If they differ, this is an attack — log it and deny.
  const tenantId = session.activeTenantId;
  if (opts.tenantSlug) {
    const t = await getTenantBySlug(opts.tenantSlug);
    if (!t || t.id !== tenantId) {
      await logSecurityEvent("tenant_mismatch", { session, opts });
      throw new ForbiddenError();
    }
  }
  if (!tenantId) throw new ForbiddenError("No active tenant on session");

  // 3. Re-read membership from DB. Never from the cookie.
  const membership = await getMembership(session.userId, tenantId);
  if (!membership || membership.status !== "ACTIVE") {
    throw new ForbiddenError();
  }

  // 4. Tenant must be APPROVED (except for the onboarding routes).
  //    SUSPENDED tenants get read-only; PENDING/REJECTED get nothing.
  // SPEC-GAP: needs the tenant status lookup wired in — P2 (registration
  // & approval), once Tenant.status is actually reachable from here.

  // 5. Check permission against the role matrix.
  if (!can(membership.role, opts.permission)) throw new ForbiddenError();

  // 6. Centre scoping for STAFF.
  if (membership.role === "STAFF" && opts.centreId) {
    if (!membership.centreIds.includes(opts.centreId)) {
      throw new ForbiddenError();
    }
  }

  return { session, tenantId, membership };
}
