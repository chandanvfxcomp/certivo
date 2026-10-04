// tests/tenant-isolation.test.ts
//
// The literal Section 17 P0 Done-when condition, through the real
// application stack (Prisma + withTenant()) rather than raw psql —
// scripts/verify-rls.sh proves the same thing at the SQL layer with no
// Node involved at all; this is the version that will actually run in CI
// against the app's own code path.
//
// Requires a migrated database reachable via DATABASE_URL/DIRECT_URL
// (see README.md / .github/workflows/ci.yml for how CI sets this up;
// locally: scripts/setup-db-roles.sh, then apply both files in
// prisma/migrations/ before running this).
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";

// Fixed 26-char ids for reproducibility — same derivation
// scripts/verify-rls.sh uses (`substr(upper(md5(seed)), 1, 26)`), computed here
// in JS so both paths can seed/assert against identical ids independently.
import { createHash } from "node:crypto";
function idFor(seed: string): string {
  // Uppercase: md5 hex uppercased is valid Crockford Base32 (0-9A-F, no
  // I/L/O/U in hex), matching withTenant()'s ULID validation — the same
  // derivation scripts/verify-rls.sh uses (substr(upper(md5(seed)), 1, 26)).
  return createHash("md5").update(seed).digest("hex").toUpperCase().slice(0, 26);
}

const tenantAId = idFor("vitest-tenant-a-seed");
const tenantBId = idFor("vitest-tenant-b-seed");
const centreAId = idFor("vitest-centre-a-seed");
const centreBId = idFor("vitest-centre-b-seed");
const studentA1Id = idFor("vitest-student-a1-seed");
const studentA2Id = idFor("vitest-student-a2-seed");
const studentB1Id = idFor("vitest-student-b1-seed");

async function seed() {
  // Seeding bypasses RLS the same way a real migration/admin task would:
  // migrator (DIRECT_URL) has BYPASSRLS. We reuse the app's own `prisma`
  // client here only because in this test DB, both roles' credentials
  // resolve through the same Prisma datasource config — see the seed via
  // raw SQL executed as whichever role DATABASE_URL points at in the test
  // environment (CI sets it to app_user, so seeding here goes through
  // withTenant() per-tenant instead of a cross-tenant bypass, keeping the
  // test honest about what app code can actually do).
  await withTenant(tenantAId, async (tx) => {
    await tx.tenant.upsert({
      where: { id: tenantAId },
      update: {},
      create: {
        id: tenantAId,
        slug: `vitest-tenant-a-${tenantAId.slice(0, 8)}`,
        name: "Vitest Tenant A",
        type: "ACADEMY",
        status: "APPROVED",
        ownerName: "Owner A",
        ownerEmail: `ownera-${tenantAId.slice(0, 8)}@example.com`,
        ownerPhone: "9990000001",
        addressLine1: "Line 1",
        city: "City",
        state: "State",
        pincode: "110001",
        termsAcceptedAt: new Date(),
        termsVersion: "v1",
      },
    });
  });

  await withTenant(tenantBId, async (tx) => {
    await tx.tenant.upsert({
      where: { id: tenantBId },
      update: {},
      create: {
        id: tenantBId,
        slug: `vitest-tenant-b-${tenantBId.slice(0, 8)}`,
        name: "Vitest Tenant B",
        type: "ACADEMY",
        status: "APPROVED",
        ownerName: "Owner B",
        ownerEmail: `ownerb-${tenantBId.slice(0, 8)}@example.com`,
        ownerPhone: "9990000002",
        addressLine1: "Line 1",
        city: "City",
        state: "State",
        pincode: "110002",
        termsAcceptedAt: new Date(),
        termsVersion: "v1",
      },
    });
  });

  await withTenant(tenantAId, async (tx) => {
    await tx.centre.upsert({
      where: { id: centreAId },
      update: {},
      create: { id: centreAId, tenantId: tenantAId, name: "Centre A", code: "CA1" },
    });
    await tx.student.upsert({
      where: { id: studentA1Id },
      update: {},
      create: {
        id: studentA1Id,
        tenantId: tenantAId,
        centreId: centreAId,
        studentCode: "STU-A-1",
        fullName: "Student A1",
        createdBy: tenantAId,
      },
    });
    await tx.student.upsert({
      where: { id: studentA2Id },
      update: {},
      create: {
        id: studentA2Id,
        tenantId: tenantAId,
        centreId: centreAId,
        studentCode: "STU-A-2",
        fullName: "Student A2",
        createdBy: tenantAId,
      },
    });
  });

  await withTenant(tenantBId, async (tx) => {
    await tx.centre.upsert({
      where: { id: centreBId },
      update: {},
      create: { id: centreBId, tenantId: tenantBId, name: "Centre B", code: "CB1" },
    });
    await tx.student.upsert({
      where: { id: studentB1Id },
      update: {},
      create: {
        id: studentB1Id,
        tenantId: tenantBId,
        centreId: centreBId,
        studentCode: "STU-B-1",
        fullName: "Student B1",
        createdBy: tenantBId,
      },
    });
  });
}

describe("tenant isolation (Section 17 P0 Done-when)", () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("a query with NO set_config returns zero rows — the literal Done-when condition", async () => {
    // No withTenant() wrapper here, deliberately: this is what happens if
    // a future code path forgets to use it.
    const rows = await prisma.student.findMany();
    expect(rows).toHaveLength(0);
  });

  it("withTenant(tenantA) sees only tenant A's students", async () => {
    const rows = await withTenant(tenantAId, (tx) =>
      tx.student.findMany({ orderBy: { studentCode: "asc" } }),
    );
    expect(rows.map((r) => r.studentCode)).toEqual(["STU-A-1", "STU-A-2"]);
  });

  it("withTenant(tenantB) sees only tenant B's students, never tenant A's", async () => {
    const rows = await withTenant(tenantBId, (tx) => tx.student.findMany());
    expect(rows.map((r) => r.studentCode)).toEqual(["STU-B-1"]);
  });

  it("app.tenant_id does not leak across separate withTenant() calls", async () => {
    await withTenant(tenantAId, (tx) => tx.student.findMany());
    const rows = await prisma.student.findMany();
    expect(rows).toHaveLength(0);
  });
});
