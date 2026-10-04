// src/server/audit/log.ts
//
// QA audit finding C5: AuditLog is modeled and deliberately hardened at
// the database level (UPDATE/DELETE revoked from app_user — append-only,
// see prisma/migrations/*_roles_and_rls) but nothing in the app ever
// wrote to it, so there was no way to answer "who reset this student's
// password and when" after the fact. This helper is the one place every
// sensitive admin/student action writes its audit row from.
//
// Takes a `Prisma.TransactionClient` (not the top-level `prisma` client)
// so callers can write the audit row in the SAME transaction as the
// mutation it's recording — either both commit or neither does. Always
// call it through `withTenant()`'s `tx`, never bypass tenant context.
import type { Prisma } from "@prisma/client";
import { ulid } from "@/lib/ulid";

export interface AuditLogEntry {
  tenantId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  entry: AuditLogEntry,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      id: ulid(),
      tenantId: entry.tenantId,
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
    },
  });
}

export interface PlatformAuditLogEntry {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: unknown;
}

/**
 * Platform-level audit trail (Super Admin actions) — writes to
 * platform_audit_log, which is NOT tenant-scoped, so it takes the
 * top-level prisma client, not a withTenant() transaction.
 */
export async function writePlatformAuditLog(entry: PlatformAuditLogEntry): Promise<void> {
  const { prisma } = await import("@/server/db/client");
  await prisma.platformAuditLog.create({
    data: {
      id: ulid(),
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
