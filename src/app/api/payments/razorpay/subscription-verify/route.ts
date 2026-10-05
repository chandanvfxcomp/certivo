import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/auth/session";
import {
  verifyRazorpaySignature,
  fetchRazorpayOrder,
} from "@/server/payments/razorpay";
import { getPlan, activateSubscription } from "@/server/subscription/service";
import { logger } from "@/lib/logger";

// POST /api/payments/razorpay/subscription-verify
// Body: { planId, orderId, paymentId, signature }
// Verifies the Checkout signature + amount + receipt binding, then activates
// the yearly subscription. Idempotent (replayed verifies are safe).
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    planId?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  } | null;
  const { planId, orderId, paymentId, signature } = body ?? {};
  if (!planId || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }

  if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
    logger.warn("razorpay.subscription.signature_invalid", { orderId, planId });
    return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
  }

  // Source of truth: fetch the order, check amount + receipt binding.
  const order = await fetchRazorpayOrder(orderId).catch(() => null);
  if (!order || order.status !== "paid") {
    logger.warn("razorpay.subscription.not_paid", { orderId, planId });
    return NextResponse.json({ error: "NOT_PAID" }, { status: 400 });
  }
  const amountPaise = Math.round(Number(order.amount ?? 0));
  if (amountPaise !== plan.pricePaise) {
    logger.warn("razorpay.subscription.amount_mismatch", { orderId, planId });
    return NextResponse.json({ error: "AMOUNT_MISMATCH" }, { status: 400 });
  }
  const receiptOk =
    order.receipt?.startsWith(`certivo:subscription:${session.tenantId}:${planId}:`) === true ||
    (order.notes?.kind === "subscription" &&
      order.notes?.tenantId === session.tenantId &&
      order.notes?.planId === planId);
  if (!receiptOk) {
    logger.warn("razorpay.subscription.receipt_mismatch", { orderId, planId });
    return NextResponse.json({ error: "ORDER_MISMATCH" }, { status: 400 });
  }

  await activateSubscription({
    tenantId: session.tenantId,
    planId: plan.id,
    amountPaise: plan.pricePaise,
    provider: "razorpay",
    providerOrderId: orderId,
    providerPaymentId: paymentId,
    actorId: session.userId,
  });
  return NextResponse.json({ ok: true });
}
