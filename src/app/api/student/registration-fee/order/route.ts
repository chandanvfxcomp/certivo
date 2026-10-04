import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { prisma } from "@/server/db/client";
import { isRazorpayConfigured, createRazorpayOrder } from "@/server/payments/razorpay";
import { isCashfreeConfigured, createCashfreeOrder, isCashfreeLive } from "@/server/payments/cashfree";
import { ulid } from "@/lib/ulid";

// POST /api/student/registration-fee/order
// Body: { provider: "razorpay" | "cashfree" }
// Creates a payment order for the student's registration fee. The amount
// comes from the tenant's registrationFeePaise setting — never from the
// client, so it can't be tampered with.
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { provider?: string } | null;
  const provider = body?.provider;
  if (provider !== "razorpay" && provider !== "cashfree") {
    return NextResponse.json({ error: "INVALID_PROVIDER" }, { status: 400 });
  }
  if (provider === "razorpay" && !isRazorpayConfigured()) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }
  if (provider === "cashfree" && !isCashfreeConfigured()) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }

  // Tenant fee config lives on the platform-level tenant table (no RLS).
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    select: { registrationFeePaise: true, name: true },
  });
  const amountPaise = tenant.registrationFeePaise;
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "NO_FEE_DUE" }, { status: 400 });
  }

  const student = await withTenant(session.tenantId, (tx) =>
    tx.student.findFirst({
      where: { id: session.studentId, tenantId: session.tenantId, deletedAt: null },
      select: { registrationFeePaid: true, email: true, phone: true, fullName: true },
    }),
  );
  if (!student) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (student.registrationFeePaid) {
    return NextResponse.json({ error: "ALREADY_PAID" }, { status: 400 });
  }

  const receipt = `certivo:regfee:${session.tenantId}:${session.studentId}:${ulid()}`;

  if (provider === "razorpay") {
    const order = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        kind: "registration_fee",
        tenantId: session.tenantId,
        studentId: session.studentId,
      },
    });
    return NextResponse.json({
      provider,
      orderId: order.id,
      amountPaise,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  }

  // cashfree
  const orderId = `certivo_reg_${ulid()}`;
  const order = await createCashfreeOrder({
    orderId,
    amountPaise,
    customerId: session.studentId,
    customerEmail: student.email ?? undefined,
    customerPhone: student.phone ?? undefined,
    notes: {
      kind: "registration_fee",
      tenantId: session.tenantId,
      studentId: session.studentId,
    },
  });
  return NextResponse.json({
    provider,
    orderId,
    paymentSessionId: order.payment_session_id,
    amountPaise,
    mode: isCashfreeLive() ? "production" : "sandbox",
  });
}
