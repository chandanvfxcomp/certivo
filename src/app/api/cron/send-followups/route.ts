import { NextResponse } from "next/server";
import { sendDueFollowUps } from "@/server/leads/followup-sender";
import { logger } from "@/lib/logger";

// GET /api/cron/send-followups — automation endpoint for due follow-up emails.
// Called daily by the GitHub Actions workflow (.github/workflows/send-followups.yml).
// Auth: ?secret=CRON_SECRET (a long random string in env). Never expose it.
export async function GET(req: Request): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  }
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (provided !== expected) {
    logger.warn("cron.unauthorized_followups");
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await sendDueFollowUps(100);
  logger.info("cron.followups_sent", { ...result });
  return NextResponse.json({ ok: true, ...result });
}
