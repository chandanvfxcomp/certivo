import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/auth/session";
import { runMigrations } from "@/server/deploy/migrate";
import { logger } from "@/lib/logger";

// POST /api/super-admin/db/migrate — 1-click `prisma migrate deploy`.
export async function POST(): Promise<NextResponse> {
  try {
    await requireSuperAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const result = await runMigrations();
  logger.info("db.migrate", { ok: result.ok });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
