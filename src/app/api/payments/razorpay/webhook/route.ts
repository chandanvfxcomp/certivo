import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { verifyRazorpayWebhookSignature } from "@/server/payments/razorpay";
import { logger } from "@/lib/logger";

// POST /api/payments/razorpay/webhook
// Razorpay server-to-server webhook — the reconciliation path for payments
// whose verify call never completed (closed tab, network drop). Only
// handles payment.captured; everything else is acknowledged and ignored.
// Configure the URL + secret in the Razorpay dashboard, and set
// RAZORPAY_WEBHOOK_SECRET (see .env.example).
export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    logger.warn("razorpay.webhook_signature_invalid", {});
    return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; notes?: Record<string, string> } } };
  };
  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const notes = event.payload?.payment?.entity?.notes ?? {};
  const certificateId = notes.certificateId;
  const kind = notes.kind;
  const tenantId = notes.tenantId;
  if (!certificateId || !tenantId || kind !== "platform_fee") {
    logger.warn("razorpay.webhook_missing_notes", {});
    return NextResponse.json({ ok: true, ignored: "missing-notes" });
  }

  // Platform-level write (no session here) — scope strictly by the
  // certificate id + tenant id from the verified webhook notes.
  const data = { platformFeePaid: true, platformFeePaidAt: new Date(), downloadCount: 0 };
  await prisma.certificate.updateMany({
    where: { id: certificateId, tenantId },
    data,
  });
  logger.info("razorpay.webhook_captured", { certificateId, kind });
  return NextResponse.json({ ok: true });
}
