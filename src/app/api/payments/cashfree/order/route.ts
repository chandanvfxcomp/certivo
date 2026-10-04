import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { requireAdminSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { isCashfreeConfigured, createCashfreeOrder } from "@/server/payments/cashfree";
import { getTemplateMeta, isTemplateId } from "@/server/certificates/templates/registry";
import { canUseTemplate } from "@/server/certificates/template-service";
import { PLATFORM_REDOWNLOAD_FEE_PAISE } from "@/config/certificate";
import { ulid } from "@/lib/ulid";

// POST /api/payments/cashfree/order
// Body: { purpose: "platform_fee" | "template_unlock", certificateId?, templateId? }
// Creates a Cashfree order and returns { paymentSessionId, orderId } for Checkout.js.
// Student session for platform_fee, admin session for template_unlock.
export async function POST(req: Request): Promise<NextResponse> {
  if (!isCashfreeConfigured()) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    purpose?: string;
    certificateId?: string;
    templateId?: string;
  } | null;
  const { purpose, certificateId, templateId } = body ?? {};
  if (purpose !== "platform_fee" && purpose !== "template_unlock") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (purpose === "platform_fee") {
    let session;
    try {
      session = await requireStudentSession();
    } catch {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (!certificateId) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const certificate = await withTenant(session.tenantId, (tx) =>
      tx.certificate.findFirst({
        where: { id: certificateId, studentId: session.studentId, tenantId: session.tenantId },
        include: { student: { select: { email: true, phone: true } } },
      }),
    );
    if (!certificate) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (certificate.platformFeePaid) {
      return NextResponse.json({ error: "ALREADY_PAID" }, { status: 400 });
    }

    const orderId = `certivo_pf_${ulid()}`;
    const order = await createCashfreeOrder({
      orderId,
      amountPaise: PLATFORM_REDOWNLOAD_FEE_PAISE,
      customerId: session.studentId,
      customerEmail: certificate.student.email ?? undefined,
      customerPhone: certificate.student.phone ?? undefined,
      notes: {
        purpose: "platform_fee",
        certificateId,
        studentId: session.studentId,
        tenantId: session.tenantId,
      },
    });
    return NextResponse.json({ paymentSessionId: order.payment_session_id, orderId });
  }

  // template_unlock — admin session
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
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

  const orderId = `certivo_tu_${ulid()}`;
  const order = await createCashfreeOrder({
    orderId,
    amountPaise: meta.pricePaise,
    customerId: session.userId,
    notes: { purpose: "template_unlock", tenantId: session.tenantId, templateId },
  });
  return NextResponse.json({ paymentSessionId: order.payment_session_id, orderId });
}
