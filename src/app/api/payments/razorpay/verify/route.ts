import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import {
  verifyRazorpaySignature,
  fetchRazorpayOrder,
} from "@/server/payments/razorpay";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

// POST /api/payments/razorpay/verify
// Body: { certificateId, kind, orderId, paymentId, signature }
// Verifies the Checkout signature, then confirms the order was actually
// created for THIS certificate+kind (receipt check — blocks replays), and
// marks the fee paid. Idempotent: re-verifying an already-paid fee is a
// no-op success.
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    certificateId?: string;
    kind?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  } | null;
  const { certificateId, kind, orderId, paymentId, signature } = body ?? {};
  if (!certificateId || !orderId || !paymentId || !signature || kind !== "platform_fee") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
    logger.warn("razorpay.signature_invalid", { orderId, certificateId });
    return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
  }

  // Replay guard: the order's receipt must name this exact certificate+kind.
  const order = await fetchRazorpayOrder(orderId).catch(() => null);
  const receiptOk =
    order?.receipt?.startsWith(`certivo:${certificateId}:${kind}:`) === true ||
    (order?.notes?.certificateId === certificateId && order?.notes?.kind === kind);
  if (!receiptOk) {
    logger.warn("razorpay.receipt_mismatch", { orderId, certificateId, kind });
    return NextResponse.json({ error: "ORDER_MISMATCH" }, { status: 400 });
  }

  const data = { platformFeePaid: true, platformFeePaidAt: new Date() };

  const updated = await withTenant(session.tenantId, async (tx) => {
    const result = await tx.certificate.updateMany({
      where: { id: certificateId, studentId: session.studentId, tenantId: session.tenantId },
      data,
    });
    if (result.count > 0) {
      await writeAuditLog(tx, {
        tenantId: session.tenantId,
        actorId: session.userId,
        action: "certificate.platform_fee_paid_via_razorpay",
        targetType: "certificate",
        targetId: certificateId,
        after: { orderId, paymentId },
      });
    }
    return result.count;
  });

  if (updated === 0) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  logger.info("razorpay.payment_verified", { orderId, paymentId, certificateId, kind });
  return NextResponse.json({ ok: true });
}
