import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import {
  isRazorpayConfigured,
  createRazorpayOrder,
} from "@/server/payments/razorpay";
import { PLATFORM_REDOWNLOAD_FEE_PAISE } from "@/config/certificate";
import { ulid } from "@/lib/ulid";

// POST /api/payments/razorpay/order
// Body: { certificateId: string, kind: "platform_fee" }
// Creates a Razorpay order and returns { orderId, amountPaise, keyId } for
// Checkout.js. The receipt binds the order to this exact certificate +
// fee kind, so the verify step can reject replays.
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    certificateId?: string;
    kind?: string;
  } | null;
  const certificateId = body?.certificateId;
  const kind = body?.kind;
  if (!certificateId || kind !== "platform_fee") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const certificate = await withTenant(session.tenantId, (tx) =>
    tx.certificate.findFirst({
      where: { id: certificateId, studentId: session.studentId, tenantId: session.tenantId },
    }),
  );
  if (!certificate) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const amountPaise = PLATFORM_REDOWNLOAD_FEE_PAISE;
  // Don't sell what's already paid.
  if (certificate.platformFeePaid) {
    return NextResponse.json({ error: "ALREADY_PAID" }, { status: 400 });
  }

  const receipt = `certivo:${certificateId}:${kind}:${ulid()}`;
  const order = await createRazorpayOrder({
    amountPaise,
    receipt,
    notes: {
      certificateId,
      kind,
      studentId: session.studentId,
      tenantId: session.tenantId,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amountPaise,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
