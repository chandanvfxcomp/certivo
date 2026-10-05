// src/server/subscription/service.ts
//
// Institute subscription plans — business logic:
// - which plans are available (active, ordered)
// - whether a tenant's subscription is currently usable (ACTIVE + not expired)
// - activating a plan after successful payment (1 year from payment)
// - enforcing per-plan student limits at registration time
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";
import { ulid } from "@/lib/ulid";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

export type SubscriptionStatus = "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "SUSPENDED";

export interface PlanFeatures {
  bulkIssuance?: boolean;
  analytics?: boolean;
  allTemplates?: boolean;
  whiteLabel?: boolean;
}

export interface PlanInfo {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  studentLimit: number; // -1 = unlimited
  features: PlanFeatures;
  sortOrder: number;
}

export interface SubscriptionState {
  status: SubscriptionStatus;
  /** Usable right now: status ACTIVE and not past subscriptionEndsAt. */
  usable: boolean;
  plan: PlanInfo | null;
  subscriptionEndsAt: Date | null;
}

function toPlanInfo(p: {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  studentLimit: number;
  features: unknown;
  sortOrder: number;
}): PlanInfo {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    pricePaise: p.pricePaise,
    studentLimit: p.studentLimit,
    features: (p.features as PlanFeatures | null) ?? {},
    sortOrder: p.sortOrder,
  };
}

/** All active plans, cheapest first. */
export async function getActivePlans(): Promise<PlanInfo[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return plans.map(toPlanInfo);
}

export async function getPlan(planId: string): Promise<PlanInfo | null> {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) return null;
  return toPlanInfo(plan);
}

/**
 * Current subscription state for a tenant. Expiry is derived lazily:
 * ACTIVE + past subscriptionEndsAt ⇒ reported as EXPIRED (not usable).
 */
export async function getSubscriptionState(tenantId: string): Promise<SubscriptionState> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      plan: true,
    },
  });
  if (!tenant) {
    return { status: "PENDING_PAYMENT", usable: false, plan: null, subscriptionEndsAt: null };
  }
  const status = tenant.subscriptionStatus as SubscriptionStatus;
  const expired =
    status === "ACTIVE" && tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < new Date();
  const effectiveStatus: SubscriptionStatus = expired ? "EXPIRED" : status;
  return {
    status: effectiveStatus,
    usable: effectiveStatus === "ACTIVE",
    plan: tenant.plan ? toPlanInfo(tenant.plan) : null,
    subscriptionEndsAt: tenant.subscriptionEndsAt,
  };
}

/**
 * Enforce the plan's student limit. Returns null when the tenant may add
 * `additional` more students, otherwise a human-readable error message.
 * Unlimited plans (studentLimit === -1) never block.
 */
export async function checkStudentLimit(
  tenantId: string,
  additional: number = 1,
): Promise<string | null> {
  const state = await getSubscriptionState(tenantId);
  const limit = state.plan?.studentLimit;
  if (limit === undefined || limit === null || limit === -1) return null;
  const current = await withTenant(tenantId, (tx) =>
    tx.student.count({ where: { tenantId } }),
  );
  if (current + additional > limit) {
    return `Student limit reached for your plan (${limit} students). Upgrade your plan to add more students.`;
  }
  return null;
}

/**
 * Activate a subscription after a verified payment. Sets the plan, marks
 * ACTIVE for exactly one year, and records the payment. Idempotent on the
 * provider order id — a replayed verify call won't double-extend.
 */
export async function activateSubscription(opts: {
  tenantId: string;
  planId: string;
  amountPaise: number;
  provider: "razorpay" | "cashfree";
  providerOrderId: string;
  providerPaymentId?: string;
  actorId: string;
}): Promise<void> {
  const plan = await getPlan(opts.planId);
  if (!plan) throw new Error("Plan not found or inactive");
  if (plan.pricePaise !== opts.amountPaise) throw new Error("Amount mismatch");

  await withTenant(opts.tenantId, async (tx) => {
    // Idempotency: same provider order already recorded as SUCCESS ⇒ done.
    const existing = await tx.subscriptionPayment.findFirst({
      where: {
        tenantId: opts.tenantId,
        providerOrderId: opts.providerOrderId,
        status: "SUCCESS",
      },
    });
    if (existing) {
      logger.info("subscription.already_activated", {
        tenantId: opts.tenantId,
        orderId: opts.providerOrderId,
      });
      return;
    }

    const endsAt = new Date();
    endsAt.setFullYear(endsAt.getFullYear() + 1);

    await tx.subscriptionPayment.create({
      data: {
        id: ulid(),
        tenantId: opts.tenantId,
        planId: plan.id,
        amountPaise: opts.amountPaise,
        provider: opts.provider,
        providerOrderId: opts.providerOrderId,
        providerPaymentId: opts.providerPaymentId ?? null,
        status: "SUCCESS",
      },
    });

    await tx.tenant.update({
      where: { id: opts.tenantId },
      data: {
        planId: plan.id,
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt,
      },
    });

    await writeAuditLog(tx, {
      tenantId: opts.tenantId,
      actorId: opts.actorId,
      action: "subscription.activated",
      targetType: "plan",
      targetId: plan.id,
      after: {
        planName: plan.name,
        amountPaise: opts.amountPaise,
        provider: opts.provider,
        orderId: opts.providerOrderId,
        endsAt: endsAt.toISOString(),
      },
    });
  });

  logger.info("subscription.activated", {
    tenantId: opts.tenantId,
    planId: plan.id,
    provider: opts.provider,
  });
}

/** Super-admin: full plan list including inactive, for management. */
export async function getAllPlans(): Promise<
  (PlanInfo & { isActive: boolean; createdAt: Date })[]
> {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return plans.map((p) => ({ ...toPlanInfo(p), isActive: p.isActive, createdAt: p.createdAt }));
}
