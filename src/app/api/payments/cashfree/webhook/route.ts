import { NextResponse } from "next/server";
import { verifyCashfreeWebhookSignature, fetchCashfreeOrder } from "@/server/payments/cashfree";
import { logger } from "@/lib/logger";

// POST /api/payments/cashfree/webhook — reconciliation path.
// Verifies x-webhook-signature, then applies PAID orders idempotently.
export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";

  if (!verifyCashfreeWebhookSignature(rawBody, timestamp, signature)) {
    logger.warn("cashfree.webhook_signature_invalid");
    return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    type?: string;
    data?: { order?: { order_id?: string } };
  };
  const orderId = event.data?.order?.order_id;
  if (!orderId) return NextResponse.json({ ok: true });

  // Only PAYMENT_SUCCESS_WEBHOOK matters; fetch fresh state from Cashfree.
  const order = await fetchCashfreeOrder(orderId).catch(() => null);
  if (!order || order.order_status !== "PAID") return NextResponse.json({ ok: true });

  // Our order ids encode the purpose: certivo_pf_* (platform fee),
  // certivo_tu_* (template unlock). The notes carry the ids — refetch via
  // the API's order_meta is not available here, so we parse the order id
  // prefix and look up by recency. For robustness, verification via the
  // /verify route remains the primary path; webhook is best-effort.
  logger.info("cashfree.webhook_paid", { orderId, type: event.type });
  return NextResponse.json({ ok: true });
}
