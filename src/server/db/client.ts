// src/server/db/client.ts
//
// Prisma client singleton. Connects as `app_user` via DATABASE_URL — the
// RLS-enforced pooled connection (Section 6.3). Never import PrismaClient
// directly anywhere else; go through this file (or, for tenant-scoped
// data, through withTenant() in ./tenant-client.ts).
//
// Standard Next.js dev-mode singleton: hot reload re-evaluates modules on
// every save, which would otherwise open a fresh Prisma connection pool
// per reload. Stashing the instance on `globalThis` survives the reload.
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
