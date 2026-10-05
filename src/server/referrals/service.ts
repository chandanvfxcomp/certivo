// src/server/referrals/service.ts
//
// Referral program business logic:
// - granting the 30-day reward when a referred institute pays for their
//   FIRST subscription plan (idempotent per payment)
// - referral stats for the institute dashboard
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";
import { ulid } from "@/lib/ulid";
import { writeAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";

export const REFERRAL_REWARD_DAYS = 30;

export interface ReferralStats {
  referralCode: string | null;
  shareUrl: string | null;
  totalReferred: number;
  paidCount: number;
  totalDaysEarned: number;
  referrals: Array<{
    instituteName: string;
    registeredAt: Date;
    status: "registered" | "paid";
  }>;
}

function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * Grant the referral reward after a successful subscription payment.
 * Called from activateSubscription — only rewards the FIRST successful
 * payment per referred tenant. Idempotent: one reward per payment id.
 *
 * Runs outside the payer's tenant transaction (the reward touches the
 * REFERRER's rows, so it uses the referrer's tenant scope).
 */
export async function grantReferralReward(opts: {
  referredTenantId: string;
  subscriptionPaymentId: string;
}): Promise<void> {
  // Who referred this institute?
  const referred = await prisma.tenant.findUnique({
    where: { id: opts.referredTenantId },
    select: { referredByTenantId: true },
  });
  const referrerId = referred?.referredByTenantId;
  if (!referrerId) return; // not a referred signup — nothing to do

  // Only the FIRST successful payment triggers the reward.
  const priorRewards = await prisma.referralReward.count({
    where: { referredTenantId: opts.referredTenantId },
  });
  if (priorRewards > 0) {
    logger.info("referral.already_rewarded", { referredTenantId: opts.referredTenantId });
    return;
  }

  // Idempotency: same payment already rewarded (replay safety).
  const existingForPayment = await prisma.referralReward.findUnique({
    where: { subscriptionPaymentId: opts.subscriptionPaymentId },
    select: { id: true },
  });
  if (existingForPayment) return;

  await withTenant(referrerId, async (tx) => {
    // Double-check inside the transaction (race safety).
    const dupe = await tx.referralReward.findUnique({
      where: { subscriptionPaymentId: opts.subscriptionPaymentId },
      select: { id: true },
    });
    if (dupe) return;

    const rewardId = ulid();
    await tx.referralReward.create({
      data: {
        id: rewardId,
        referrerTenantId: referrerId,
        referredTenantId: opts.referredTenantId,
        rewardType: "EXTENSION_DAYS",
        rewardDays: REFERRAL_REWARD_DAYS,
      },
    });
    // Link the reward to the triggering payment (separate update so the
    // create above never fails on the unique constraint under races —
    // the dupe checks make double-grant impossible).
    await tx.referralReward.update({
      where: { id: rewardId },
      data: { subscriptionPaymentId: opts.subscriptionPaymentId },
    });

    // Extend the referrer's subscription by 30 days from whichever is
    // later: their current expiry, or now. A referrer who never paid (or
    // lapsed) gets now+30d — and becomes ACTIVE so the reward is usable,
    // unless a super-admin suspended them.
    const referrer = await tx.tenant.findUniqueOrThrow({
      where: { id: referrerId },
      select: { subscriptionEndsAt: true, subscriptionStatus: true },
    });
    const base =
      referrer.subscriptionEndsAt && referrer.subscriptionEndsAt > new Date()
        ? referrer.subscriptionEndsAt
        : new Date();
    const extended = new Date(base.getTime() + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000);

    await tx.tenant.update({
      where: { id: referrerId },
      data: {
        subscriptionEndsAt: extended,
        // Don't resurrect SUSPENDED accounts — the reward waits for them.
        ...(referrer.subscriptionStatus === "SUSPENDED"
          ? {}
          : { subscriptionStatus: "ACTIVE" }),
      },
    });

    await writeAuditLog(tx, {
      tenantId: referrerId,
      actorId: "system",
      action: "referral.reward_granted",
      targetType: "referral_reward",
      targetId: rewardId,
      after: {
        referredTenantId: opts.referredTenantId,
        rewardDays: REFERRAL_REWARD_DAYS,
        newEndsAt: extended.toISOString(),
        paymentId: opts.subscriptionPaymentId,
      },
    });
  });

  logger.info("referral.reward_granted", {
    referrerId,
    referredTenantId: opts.referredTenantId,
    paymentId: opts.subscriptionPaymentId,
  });
}

/** Dashboard stats for an institute's own referral program. */
export async function getReferralStats(tenantId: string): Promise<ReferralStats> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { referralCode: true },
  });
  const code = tenant?.referralCode ?? null;

  const [referrals, rewards] = await Promise.all([
    prisma.tenant.findMany({
      where: { referredByTenantId: tenantId },
      select: {
        name: true,
        createdAt: true,
        subscriptionStatus: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralReward.aggregate({
      where: { referrerTenantId: tenantId },
      _sum: { rewardDays: true },
    }),
  ]);

  const paidCount = referrals.filter((r) => r.subscriptionStatus === "ACTIVE").length;

  return {
    referralCode: code,
    shareUrl: code ? `${getAppUrl()}/institute/register?ref=${code}` : null,
    totalReferred: referrals.length,
    paidCount,
    totalDaysEarned: rewards._sum.rewardDays ?? 0,
    referrals: referrals.map((r) => ({
      instituteName: r.name,
      registeredAt: r.createdAt,
      status: r.subscriptionStatus === "ACTIVE" ? ("paid" as const) : ("registered" as const),
    })),
  };
}
