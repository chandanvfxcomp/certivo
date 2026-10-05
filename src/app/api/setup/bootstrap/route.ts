import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { ulid } from "@/lib/ulid";
import { runMigrations } from "@/server/deploy/migrate";
import { logger } from "@/lib/logger";

// POST /api/setup/bootstrap — one-time bootstrap for initial production setup.
// Runs pending Prisma migrations, then creates the first super admin.
// One-time use: refuses if a super admin already exists.
// Body: { email, name?, password }
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  // One-time guard: never run twice.
  try {
    const existingAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
    if (existingAdmin) {
      return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 400 });
    }
  } catch {
    // User table may not exist yet — migrations will create it. Continue.
    logger.info("setup.bootstrap.no_user_table_yet");
  }

  // 1. Run pending migrations (creates all tables including User).
  // Time-boxed batches: the caller repeats until `remaining` hits 0.
  const migrateResult = await runMigrations(3);
  logger.info("setup.bootstrap.migrate", { ok: migrateResult.ok, remaining: migrateResult.remaining });
  if (!migrateResult.ok) {
    return NextResponse.json(
      { error: "MIGRATE_FAILED", output: migrateResult.output },
      { status: 500 }
    );
  }
  if (migrateResult.remaining > 0) {
    return NextResponse.json({
      ok: true,
      status: "migrating",
      applied: migrateResult.applied,
      remaining: migrateResult.remaining,
      message: "Migrations in progress — call again until remaining is 0.",
    });
  }

  // 2. Re-check (in case of race), then create the super admin.
  const existingAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existingAdmin) {
    return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      id: ulid(),
      email,
      name: body?.name?.trim().slice(0, 100) || "Super Admin",
      passwordHash: await hashPassword(password),
      isSuperAdmin: true,
      status: "ACTIVE",
    },
  });

  logger.info("setup.bootstrap.admin_created", { email });
  return NextResponse.json({ ok: true, email: user.email });
}
