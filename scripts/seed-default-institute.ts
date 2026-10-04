// scripts/seed-default-institute.ts
//
// Creates the single default Tenant (institute) + its one Centre + one
// admin User/Membership — the "single default institute" this MVP pivot
// registers students under until real multi-institute self-registration
// (old Section 9) is built. Idempotent: safe to re-run, does nothing if the
// tenant slug already exists.
//
// Run with: pnpm db:seed  (see package.json)
import "dotenv/config";
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";
import { hashPassword } from "@/server/auth/password";
import { ulid } from "@/lib/ulid";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required — see .env.example`);
  return value;
}

// QA audit finding C3: this script had no guard at all against being run
// against a real database with the unedited placeholder credentials from
// .env.example — `pnpm db:seed` in production with a stale .env would
// silently create a live, publicly-known admin login.
const PLACEHOLDER_ADMIN_PASSWORD = "change-me-please-123";

function assertSafeToSeed(adminPassword: string): void {
  if (process.env.NODE_ENV === "production" && adminPassword === PLACEHOLDER_ADMIN_PASSWORD) {
    throw new Error(
      "Refusing to seed: NODE_ENV is \"production\" and DEFAULT_ADMIN_PASSWORD is still the " +
        "placeholder from .env.example. Set a real, unique password in your production .env " +
        "before running this script.",
    );
  }
}

async function main() {
  const slug = requireEnv("DEFAULT_TENANT_SLUG");
  const name = requireEnv("DEFAULT_TENANT_NAME");
  const prefix = requireEnv("DEFAULT_TENANT_PREFIX");
  const adminEmail = requireEnv("DEFAULT_ADMIN_EMAIL");
  const adminName = requireEnv("DEFAULT_ADMIN_NAME");
  const adminPassword = requireEnv("DEFAULT_ADMIN_PASSWORD");
  assertSafeToSeed(adminPassword);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Tenant "${slug}" already exists (id ${existing.id}) — nothing to do.`);
    return;
  }

  const tenantId = ulid();
  const centreId = ulid();
  const adminUserId = ulid();
  const membershipId = ulid();
  const now = new Date();

  // Tenant/User/Membership are platform tables (no RLS) — plain prisma.
  await prisma.tenant.create({
    data: {
      id: tenantId,
      slug,
      prefix,
      name,
      type: "OTHER",
      status: "APPROVED",
      ownerName: adminName,
      ownerEmail: adminEmail,
      ownerPhone: "0000000000",
      addressLine1: "N/A",
      city: "N/A",
      state: "N/A",
      pincode: "000000",
      termsAcceptedAt: now,
      termsVersion: "v1",
      approvedAt: now,
    },
  });

  const passwordHash = await hashPassword(adminPassword);
  await prisma.user.create({
    data: {
      id: adminUserId,
      email: adminEmail,
      name: adminName,
      passwordHash,
      status: "ACTIVE",
    },
  });

  // Super Admin: platform-level account for approving/rejecting/suspending
  // institutes. Created from SUPER_ADMIN_* env vars when set — optional,
  // so existing single-institute deployments aren't forced to add one.
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  if (superAdminEmail && superAdminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: ulid(),
          email: superAdminEmail,
          name: process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin",
          passwordHash: await hashPassword(superAdminPassword),
          isSuperAdmin: true,
          status: "ACTIVE",
        },
      });
      console.log(`Seeded super admin: ${superAdminEmail} — log in at /super-admin/login`);
    }
  }

  await prisma.membership.create({
    data: {
      id: membershipId,
      userId: adminUserId,
      tenantId,
      role: "OWNER",
      centreIds: [],
      status: "ACTIVE",
      acceptedAt: now,
    },
  });

  // Centre is tenant-scoped (RLS) — goes through withTenant() like any
  // other application write, even though this is a one-off seed.
  await withTenant(tenantId, (tx) =>
    tx.centre.create({
      data: {
        id: centreId,
        tenantId,
        name,
        code: "MAIN",
        isPrimary: true,
      },
    }),
  );

  console.log(`Seeded default institute:
  tenant:  ${name} (slug: ${slug}, prefix: ${prefix}, id: ${tenantId})
  centre:  MAIN (id: ${centreId})
  admin:   ${adminEmail} — log in at /admin/login with the password from DEFAULT_ADMIN_PASSWORD`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
