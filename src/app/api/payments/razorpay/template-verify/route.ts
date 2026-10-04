import { NextResponse } from "next/server";
import { requireAdminSession } from "@/server/auth/session";
import {
  verifyRazorpaySignature,
  fetchRazorpayOrder,
} from "@/server/payments/razorpay";
import { getTemplateMeta, isTemplateId } from "@/server/certificates/templates/registry";
import { unlockTemplate } from "@/server/certificates/template-service";
import { logger } from "@/lib/logger";

// POST /api/payments/razorpay/template-verify
// Body: { templateId, orderId, paymentId, signature }
// Verifies the Checkout signature + receipt binding, then records the
// permanent template unlock. Idempotent.
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    templateId?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  } | null;
  const { templateId, orderId, paymentId, signature } = body ?? {};
  if (!templateId || !isTemplateId(templateId) || !orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const meta = getTemplateMeta(templateId);
  if (meta.tier === "free") {
    return NextResponse.json({ error: "INVALID_TEMPLATE" }, { status: 400 });
  }

  if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
    logger.warn("razorpay.template.signature_invalid", { orderId, templateId });
    return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
  }

  // Replay guard: order must have been created for THIS tenant + template.
  const order = await fetchRazorpayOrder(orderId).catch(() => null);
  const receiptOk =
    order?.receipt?.startsWith(`certivo:template:${session.tenantId}:${templateId}:`) === true ||
    (order?.notes?.kind === "template_unlock" &&
      order?.notes?.tenantId === session.tenantId &&
      order?.notes?.templateId === templateId);
  if (!receiptOk) {
    logger.warn("razorpay.template.receipt_mismatch", { orderId, templateId });
    return NextResponse.json({ error: "ORDER_MISMATCH" }, { status: 400 });
  }

  await unlockTemplate(session.tenantId, templateId, paymentId);
  return NextResponse.json({ ok: true });
}
