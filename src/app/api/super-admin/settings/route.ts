import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/auth/session";
import { getAllSettings, setSetting, SETTING_DEFS } from "@/server/settings/service";

// GET /api/super-admin/settings — list swappable provider settings.
export async function GET(): Promise<NextResponse> {
  try {
    await requireSuperAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const values = await getAllSettings();
  return NextResponse.json({
    defs: SETTING_DEFS,
    values,
  });
}

// POST /api/super-admin/settings — Body: { key, value }
export async function POST(req: Request): Promise<NextResponse> {
  try {
    await requireSuperAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { key?: string; value?: string } | null;
  if (!body?.key || typeof body.value !== "string") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  try {
    await setSetting(body.key, body.value);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
