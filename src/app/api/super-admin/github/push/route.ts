import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/auth/session";
import { pushToGitHub } from "@/server/deploy/github";
import { logger } from "@/lib/logger";

// POST /api/super-admin/github/push — 1-click push to GitHub.
// Super-admin only. Stages all changes, commits, and pushes to origin.
export async function POST(): Promise<NextResponse> {
  try {
    await requireSuperAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const result = await pushToGitHub();
  logger.info("github.push", { ok: result.ok, steps: result.steps.length });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
