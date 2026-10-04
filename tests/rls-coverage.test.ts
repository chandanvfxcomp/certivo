// tests/rls-coverage.test.ts
//
// CI guardrail (spec Section 17 P0: "CI (typecheck, lint, test,
// RLS-coverage test)"). Purely static — no database connection — so it
// fails fast in CI on a schema/migration mismatch before anything else
// even tries to run. Parses prisma/schema.prisma for every model that has
// a `tenantId` field (i.e. is tenant-scoped per Section 6.2), resolves
// each one's actual table name via its `@@map(...)`, and asserts the RLS
// migration creates a `tenant_isolation` policy on that exact table.
//
// This is what actually enforces "every table with a tenant_id column has
// an RLS policy, shipped in the first PR" (Section 6.3) — a future PR
// that adds a tenant-scoped model without RLS fails this test, not a
// production incident.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.join(process.cwd(), "prisma/schema.prisma");
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma/migrations");

// Every migration.sql in history, concatenated — not just the original
// roles_and_rls one. A tenant-scoped table's RLS policy can (and, for
// certificate, does — see 20260910100000_certificate_and_fees) land in a
// later migration than the table's own CREATE TABLE; what this test
// actually asserts is "a policy exists somewhere in migration history for
// this table", not "in this one specific file".
function readAllMigrations(): string {
  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(); // migration folders are timestamp-prefixed, so lexical order == chronological
  return dirs
    .map((dir) => readFileSync(path.join(MIGRATIONS_DIR, dir, "migration.sql"), "utf-8"))
    .join("\n");
}

interface ParsedModel {
  name: string;
  tableName: string;
  hasTenantId: boolean;
}

// Models that have a `tenantId` column but are deliberately NOT
// RLS-scoped — each needs a real, reviewed reason, not just "it was
// easier". Keep this list to genuine platform-table cases only.
//
// Membership: Section 6.4 requires reading a user's memberships ACROSS
// tenants at login (the tenant picker), before any tenant is selected —
// an RLS policy keyed on app.tenant_id would return zero rows at exactly
// that moment and break login for every multi-tenant user. See the
// comment on the Membership model in schema.prisma for the full
// rationale; access is guarded at the application layer instead.
const RLS_EXEMPT_MODELS = new Set<string>(["Membership"]);

function parseModels(schema: string): ParsedModel[] {
  const modelBlockPattern = /model\s+(\w+)\s*\{([^}]*)\}/g;
  const models: ParsedModel[] = [];

  for (const match of schema.matchAll(modelBlockPattern)) {
    const name = match[1]!;
    const body = match[2]!;

    const hasTenantId = /^\s*tenantId\s+String/m.test(body);

    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    // No explicit @@map means Prisma uses the model name as-is (not our
    // convention here, but fall back correctly rather than crash).
    const tableName = mapMatch ? mapMatch[1]! : name;

    models.push({ name, tableName, hasTenantId });
  }

  return models;
}

describe("RLS coverage", () => {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const rlsMigration = readAllMigrations();
  const models = parseModels(schema);
  const tenantScopedModels = models.filter(
    (m) => m.hasTenantId && !RLS_EXEMPT_MODELS.has(m.name),
  );

  it("has no exempt model that isn't actually tenantId-bearing (catches a stale exemption)", () => {
    for (const name of RLS_EXEMPT_MODELS) {
      const model = models.find((m) => m.name === name);
      expect(model, `exempt model "${name}" not found in schema`).toBeTruthy();
      expect(model!.hasTenantId).toBe(true);
    }
  });

  it("finds at least one tenant-scoped model (sanity check for the parser itself)", () => {
    expect(tenantScopedModels.length).toBeGreaterThan(0);
  });

  it.each(tenantScopedModels.map((m) => [m.name, m.tableName] as const))(
    "%s (table %s) has a tenant_isolation RLS policy in the migration",
    (_name, tableName) => {
      const policyPattern = new RegExp(
        `CREATE POLICY tenant_isolation ON "${tableName}"`,
      );
      expect(rlsMigration).toMatch(policyPattern);
    },
  );

  it.each(tenantScopedModels.map((m) => [m.name, m.tableName] as const))(
    "%s (table %s) has FORCE ROW LEVEL SECURITY, not just ENABLE",
    (_name, tableName) => {
      // ENABLE alone doesn't apply to the table owner (migrator) — but
      // more importantly, without FORCE, a role granted elevated
      // privileges later would silently bypass RLS. FORCE is the
      // guarantee, not ENABLE.
      const forcePattern = new RegExp(
        `ALTER TABLE "${tableName}" FORCE ROW LEVEL SECURITY`,
      );
      expect(rlsMigration).toMatch(forcePattern);
    },
  );
});
