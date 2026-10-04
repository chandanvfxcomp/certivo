// src/server/db/tenant-client.ts
//
// The ONLY way application code touches tenant-scoped data. Spec Section
// 6.3's exact pattern — do not deviate:
//   - Prisma doesn't set Postgres session variables automatically, so we
//     set `app.tenant_id` ourselves via `set_config`, inside the same
//     transaction as every query the caller runs.
//   - `set_config(..., true)` — the `true` (is_local) argument — makes the
//     setting transaction-local, so it can never leak across a pooled
//     connection to a different tenant's request. Never pass `false` here.
//   - This is CLAUDE.md Hard Rule #7's one exception to the
//     "never use $queryRawUnsafe" rule: `$executeRawUnsafe` is used here,
//     and only here, with the tenant id passed as a bound parameter ($1),
//     never string-interpolated — so it's parameterized, not a raw
//     injection surface. `isValidTenantId` below is a second, independent
//     line of defense: even a caller that somehow got past guard() with a
//     malformed id can't reach the database with it.
import { Prisma } from "@prisma/client";
import { prisma } from "./client";

// ULID: 26 characters, Crockford Base32 (0-9, A-Z excluding I/L/O/U).
// Matches the CHAR(26) ULID primary keys used throughout the schema
// (spec Section 4.1) — tenant.id included.
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function isValidTenantId(tenantId: string): boolean {
  return ULID_PATTERN.test(tenantId);
}

export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!isValidTenantId(tenantId)) {
    // Fails closed. A guard() bug or a caller that skipped guard() should
    // never be able to reach the database with an unvalidated tenant id —
    // this is the last line of defense before set_config, not the first.
    throw new Error(`withTenant: invalid tenant id "${tenantId}"`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.tenant_id', $1, true)`,
      tenantId,
    );
    return fn(tx);
  });
}
