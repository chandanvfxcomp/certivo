import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/auth/session";
import { isRazorpayConfigured, createRazorpayOrder } from "@/server/payments/razorpay";
import { getPlan, getSubscriptionState } from "@/server/subscription/service";
import { ulid } from "@/lib/ulid";

// POST /api/payments/razorpay/subscription-order
// Body: { planId: string }
// Creates a Razorpay order for a yearly institute subscription plan.
// Receipt binds the order to this exact tenant + plan (replay guard).
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { planId?: string } | null;
  const plan = body?.planId ? await getPlan(body.planId) : null;
  if (!plan) {
    return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  }

  const state = await getSubscriptionState(session.tenantId);
  if (state.usable && state.plan?.id === plan.id) {
    return NextResponse.json({ error: "ALREADY_SUBSCRIBED" }, { status: 400 });
  }

  const receipt = `certivo:subscription:${session.tenantId}:${plan.id}:${ulid()}`;
  const order = await createRazorpayOrder({
    amountPaise: plan.pricePaise,
    receipt,
    notes: { kind: "subscription", tenantId: session.tenantId, planId: plan.id },
  });

  return NextResponse.json({ orderId: order.id, amountPaise: plan.pricePaise });
}
