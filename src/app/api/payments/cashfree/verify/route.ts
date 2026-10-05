import { NextResponse } from "next/server";
import { requireStudentSession, requireAdminSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { fetchCashfreeOrder } from "@/server/payments/cashfree";
import { getTemplateMeta, isTemplateId } from "@/server/certificates/templates/registry";
import { unlockTemplate } from "@/server/certificates/template-service";
import { getPlan, activateSubscription } from "@/server/subscription/service";
import { PLATFORM_REDOWNLOAD_FEE_PAISE } from "@/config/certificate";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

// POST /api/payments/cashfree/verify
// Body: { orderId, purpose: "platform_fee" | "template_unlock" | "subscription", certificateId?, templateId?, planId? }
// Source of truth: fetches the order from Cashfree and requires
// order_status === "PAID" + amount match. Idempotent.
export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as {
    orderId?: string;
    purpose?: string;
    certificateId?: string;
    templateId?: string;
    planId?: string;
  } | null;
  const { orderId, purpose, certificateId, templateId, planId } = body ?? {};
  if (!orderId || (purpose !== "platform_fee" && purpose !== "template_unlock" && purpose !== "subscription")) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  // Verify with Cashfree directly — no client-trusted signature needed.
  const order = await fetchCashfreeOrder(orderId).catch(() => null);
  if (!order || order.order_status !== "PAID") {
    logger.warn("cashfree.not_paid", { orderId, status: order?.order_status });
    return NextResponse.json({ error: "NOT_PAID" }, { status: 400 });
  }

  if (purpose === "platform_fee") {
    let session;
    try {
      session = await requireStudentSession();
    } catch {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    if (!certificateId) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    if (order.order_amount * 100 !== PLATFORM_REDOWNLOAD_FEE_PAISE) {
      logger.warn("cashfree.amount_mismatch", { orderId });
      return NextResponse.json({ error: "AMOUNT_MISMATCH" }, { status: 400 });
    }

    const updated = await withTenant(session.tenantId, async (tx) => {
      const result = await tx.certificate.updateMany({
        where: { id: certificateId, studentId: session.studentId, tenantId: session.tenantId },
        data: { platformFeePaid: true, platformFeePaidAt: new Date() },
      });
      if (result.count > 0) {
        await writeAuditLog(tx, {
          tenantId: session.tenantId,
          actorId: session.userId,
          action: "certificate.platform_fee_paid_via_cashfree",
          targetType: "certificate",
          targetId: certificateId,
          after: { orderId },
        });
      }
      return result.count;
    });
    if (updated === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    logger.info("cashfree.payment_verified", { orderId, certificateId });
    return NextResponse.json({ ok: true });
  }

  if (purpose === "subscription") {
    return verifySubscription(orderId, planId, order);
  }

  // template_unlock
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
  if (order.order_amount * 100 !== meta.pricePaise) {
    logger.warn("cashfree.template_amount_mismatch", { orderId, templateId });
    return NextResponse.json({ error: "AMOUNT_MISMATCH" }, { status: 400 });
  }
  await unlockTemplate(session.tenantId, templateId, orderId);
  logger.info("cashfree.template_unlocked", { orderId, templateId });
  return NextResponse.json({ ok: true });
}

async function verifySubscription(
  orderId: string,
  planId: string | undefined,
  order: { order_status: string; order_amount: number },
): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const plan = planId ? await getPlan(planId) : null;
  if (!plan) return NextResponse.json({ error: "INVALID_PLAN" }, { status: 400 });
  if (order.order_amount * 100 !== plan.pricePaise) {
    logger.warn("cashfree.subscription_amount_mismatch", { orderId, planId });
    return NextResponse.json({ error: "AMOUNT_MISMATCH" }, { status: 400 });
  }
  await activateSubscription({
    tenantId: session.tenantId,
    planId: plan.id,
    amountPaise: plan.pricePaise,
    provider: "cashfree",
    providerOrderId: orderId,
    actorId: session.userId,
  });
  logger.info("cashfree.subscription_activated", { orderId, planId });
  return NextResponse.json({ ok: true });
}
