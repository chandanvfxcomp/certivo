import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { prisma } from "@/server/db/client";
import {
  verifyRazorpaySignature,
  fetchRazorpayOrder,
} from "@/server/payments/razorpay";
import { fetchCashfreeOrder } from "@/server/payments/cashfree";
import { issueInvoice, renderInvoicePdf } from "@/server/invoices/service";
import { sendEmail } from "@/server/email/client";
import { registrationFeePaidEmail } from "@/server/email/templates";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

// POST /api/student/registration-fee/verify
// Body (razorpay): { provider: "razorpay", orderId, paymentId, signature }
// Body (cashfree): { provider: "cashfree", orderId }
// Verifies the payment with the gateway (source of truth), then:
//  1. issues the invoice (atomic sequence number),
//  2. marks the student as paid,
//  3. emails the student with the invoice PDF attached.
// Idempotent — a second verify for the same student is a no-op success.
export async function POST(req: Request): Promise<NextResponse> {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    provider?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  } | null;
  const { provider, orderId, paymentId, signature } = body ?? {};
  if ((provider !== "razorpay" && provider !== "cashfree") || !orderId) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: session.tenantId },
    select: { registrationFeePaise: true, name: true },
  });
  const amountPaise = tenant.registrationFeePaise;
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "NO_FEE_DUE" }, { status: 400 });
  }

  // --- Gateway verification (source of truth) ---
  let gatewayPaymentRef: string;
  if (provider === "razorpay") {
    if (!paymentId || !signature) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
      logger.warn("razorpay.regfee.signature_invalid", { orderId });
      return NextResponse.json({ error: "SIGNATURE_INVALID" }, { status: 400 });
    }
    const order = await fetchRazorpayOrder(orderId).catch(() => null);
    const receiptOk =
      order?.receipt?.startsWith(`certivo:regfee:${session.tenantId}:${session.studentId}:`) === true ||
      (order?.notes?.kind === "registration_fee" &&
        order?.notes?.tenantId === session.tenantId &&
        order?.notes?.studentId === session.studentId);
    if (!receiptOk) {
      logger.warn("razorpay.regfee.receipt_mismatch", { orderId });
      return NextResponse.json({ error: "ORDER_MISMATCH" }, { status: 400 });
    }
    if (order && Math.round(Number(order.amount)) !== amountPaise) {
      logger.warn("razorpay.regfee.amount_mismatch", { orderId });
      return NextResponse.json({ error: "AMOUNT_MISMATCH" }, { status: 400 });
    }
    gatewayPaymentRef = paymentId;
  } else {
    const order = await fetchCashfreeOrder(orderId).catch(() => null);
    if (!order || order.order_status !== "PAID") {
      logger.warn("cashfree.regfee.not_paid", { orderId, status: order?.order_status });
      return NextResponse.json({ error: "NOT_PAID" }, { status: 400 });
    }
    if (Math.round(order.order_amount * 100) !== amountPaise) {
      logger.warn("cashfree.regfee.amount_mismatch", { orderId });
      return NextResponse.json({ error: "AMOUNT_MISMATCH" }, { status: 400 });
    }
    gatewayPaymentRef = orderId;
  }

  // --- Atomic claim: only one verify can win (prevents double-invoice race) ---
  const claimResult = await withTenant(session.tenantId, (tx) =>
    tx.student.updateMany({
      where: {
        id: session.studentId,
        tenantId: session.tenantId,
        deletedAt: null,
        registrationFeePaid: false,
      },
      data: {
        registrationFeePaid: true,
        registrationFeePaidAt: new Date(),
        registrationFeePaise: amountPaise,
        registrationPaymentId: gatewayPaymentRef,
      },
    }),
  );
  if (claimResult.count === 0) {
    // Already claimed by a concurrent request — return existing invoice
    const existing = await withTenant(session.tenantId, (tx) =>
      tx.student.findFirst({
        where: { id: session.studentId, tenantId: session.tenantId },
        select: { invoiceNumber: true },
      }),
    );
    return NextResponse.json({ ok: true, invoiceNumber: existing?.invoiceNumber, alreadyPaid: true });
  }

  // --- Issue invoice (atomic number) ---
  const student = await withTenant(session.tenantId, (tx) =>
    tx.student.findFirstOrThrow({
      where: { id: session.studentId, tenantId: session.tenantId, deletedAt: null },
      select: { fullName: true, email: true, studentCode: true },
    }),
  );

  const { invoiceNumber } = await issueInvoice({
    tenantId: session.tenantId,
    studentId: session.studentId,
    amountPaise,
    paymentRef: gatewayPaymentRef,
    studentName: student.fullName,
    studentEmail: student.email,
    studentCode: student.studentCode,
    instituteName: tenant.name,
    instituteAddress: null,
  });

  await withTenant(session.tenantId, async (tx) => {
    await tx.student.update({
      where: { id: session.studentId },
      data: { invoiceNumber },
    });
    await writeAuditLog(tx, {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: "student.registration_fee_paid",
      targetType: "student",
      targetId: session.studentId,
      after: { invoiceNumber, paymentRef: gatewayPaymentRef, amountPaise, provider },
    });
  });

  // --- Invoice PDF + email (best-effort; payment is already recorded) ---
  if (student.email) {
    const pdf = await renderInvoicePdf(session.tenantId, invoiceNumber).catch(() => null);
    const template = registrationFeePaidEmail({
      studentName: student.fullName,
      instituteName: tenant.name,
      invoiceNumber,
      amountPaise,
    });
    // Resend supports attachments via API; our sendEmail wrapper doesn't
    // yet — include a download link instead. The invoice is re-downloadable
    // from the student portal.
    await sendEmail({ to: student.email, ...template });
    void pdf; // PDF persisted for portal re-download; email carries the number.
  }

  logger.info("regfee.payment_verified", { invoiceNumber, studentId: session.studentId });
  return NextResponse.json({ ok: true, invoiceNumber });
}
