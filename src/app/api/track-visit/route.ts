import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { logVisit } from "@/server/visits/tracker";

// POST /api/track-visit — Body: { path: string }
// Anonymous visit beacon for the super-admin analytics dashboard.
// Always returns ok; tracking never blocks the page.
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json().catch(() => null)) as { path?: string } | null;
    const path = body?.path;
    if (typeof path === "string" && path.startsWith("/")) {
      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null;
      await logVisit({
        path,
        ip,
        userAgent: h.get("user-agent"),
        referrer: h.get("referer"),
      });
    }
  } catch {
    // never break the client
  }
  return NextResponse.json({ ok: true });
}
