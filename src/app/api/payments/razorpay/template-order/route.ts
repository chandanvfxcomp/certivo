import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/auth/session";
import { isRazorpayConfigured, createRazorpayOrder } from "@/server/payments/razorpay";
import { getTemplateMeta, isTemplateId } from "@/server/certificates/templates/registry";
import { canUseTemplate } from "@/server/certificates/template-service";
import { ulid } from "@/lib/ulid";

// POST /api/payments/razorpay/template-order
// Body: { templateId: string }
// Creates a Razorpay order for a premium template's one-time unlock fee.
// Receipt binds the order to this exact tenant + template (replay guard).
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

  const body = (await req.json().catch(() => null)) as { templateId?: string } | null;
  const templateId = body?.templateId;
  if (!templateId || !isTemplateId(templateId)) {
    return NextResponse.json({ error: "INVALID_TEMPLATE" }, { status: 400 });
  }
  const meta = getTemplateMeta(templateId);
  if (meta.tier === "free" || meta.pricePaise <= 0) {
    return NextResponse.json({ error: "NO_FEE_DUE" }, { status: 400 });
  }
  if (await canUseTemplate(session.tenantId, templateId)) {
    return NextResponse.json({ error: "ALREADY_UNLOCKED" }, { status: 400 });
  }

  const receipt = `certivo:template:${session.tenantId}:${templateId}:${ulid()}`;
  const order = await createRazorpayOrder({
    amountPaise: meta.pricePaise,
    receipt,
    notes: { kind: "template_unlock", tenantId: session.tenantId, templateId },
  });

  return NextResponse.json({ orderId: order.id, amountPaise: meta.pricePaise });
}
