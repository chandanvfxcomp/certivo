import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/auth/session";
import { runMigrations } from "@/server/deploy/migrate";
import { logger } from "@/lib/logger";

// POST /api/super-admin/db/migrate — 1-click migration runner.
// Applies time-boxed batches; the UI repeats until `remaining` is 0.
export async function POST(): Promise<NextResponse> {
  try {
    await requireSuperAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const result = await runMigrations(5);
  logger.info("db.migrate", { ok: result.ok, remaining: result.remaining });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
