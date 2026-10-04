// src/server/auth/default-tenant.ts
//
// The single seeded institute every admin/student login and registration
// resolves against for now (see scripts/seed-default-institute.ts and the
// SCOPE CHANGE note in prisma/schema.prisma). Centralized here so the one
// place that changes, when multi-institute onboarding replaces this, is
// this file plus its call sites — not scattered `findUnique({ slug: ... })`
// calls.
import { prisma } from "@/server/db/client";
import type { Tenant } from "@prisma/client";

export async function getDefaultTenant(): Promise<Tenant> {
  const slug = process.env.DEFAULT_TENANT_SLUG;
  if (!slug) {
    throw new Error("DEFAULT_TENANT_SLUG is not set — see .env.example");
  }
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(
      `Default tenant "${slug}" not found — run "pnpm db:seed" first.`,
    );
  }
  return tenant;
}
