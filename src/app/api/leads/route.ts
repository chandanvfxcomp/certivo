import { NextResponse } from "next/server";
import { createLead } from "@/server/leads/service";
import { getClientIp, isRateLimited } from "@/server/auth/rate-limit";

// POST /api/leads — public lead capture (landing page "Request a callback").
// Body: { name, email?, phone?, instituteName?, message?, source? }
// Rate-limited: 5/hour per IP.
export async function POST(req: Request): Promise<NextResponse> {
  const ip = await getClientIp();
  if (isRateLimited(`lead:${ip}`)) {
    return NextResponse.json({ error: "Too many requests — please try again later" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string; email?: string; phone?: string;
    instituteName?: string; message?: string; source?: string;
  } | null;

  if (!body?.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const { id } = await createLead({
      name: body.name,
      email: body.email,
      phone: body.phone,
      instituteName: body.instituteName,
      message: body.message,
      source: body.source ?? "landing",
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save your request" },
      { status: 400 },
    );
  }
}
