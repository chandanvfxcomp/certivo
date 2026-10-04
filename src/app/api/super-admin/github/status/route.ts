import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/auth/session";
import { getRepoStatus } from "@/server/deploy/github";

// GET /api/super-admin/github/status — read-only repo status.
export async function GET(): Promise<NextResponse> {
  try {
    await requireSuperAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  return NextResponse.json(await getRepoStatus());
}
