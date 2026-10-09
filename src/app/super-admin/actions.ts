// src/app/super-admin/actions.ts
//
// Platform-level administration: Super Admin login + institute lifecycle
// (approve / reject / suspend / reactivate). Guarded by
// requireSuperAdminSession(), which re-verifies User.isSuperAdmin from the
// DB on every call — revoking the flag locks the account immediately.
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db/client";
import { verifyPassword, verifyPasswordAgainstDummy } from "@/server/auth/password";
import {
  createSessionCookie,
  clearSessionCookie,
  requireSuperAdminSession,
} from "@/server/auth/session";
import { isRateLimited, resetRateLimit, getClientIp } from "@/server/auth/rate-limit";
import { writePlatformAuditLog } from "@/server/audit/log";
import { logger } from "@/lib/logger";
import { ulid } from "@/lib/ulid";

export async function loginSuperAdmin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/super-admin/login?error=missing");

  const rateLimitKey = `superadmin:${await getClientIp()}:${email}`;
  if (await isRateLimited(rateLimitKey)) {
    logger.warn("superadmin.login_rate_limited", { email });
    redirect("/super-admin/login?error=rate_limited");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !user.isSuperAdmin || user.status !== "ACTIVE") {
    await verifyPasswordAgainstDummy(password);
    redirect("/super-admin/login?error=invalid");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) redirect("/super-admin/login?error=invalid");

  await createSessionCookie({ kind: "superadmin", userId: user.id });
  await resetRateLimit(rateLimitKey);
  logger.info("superadmin.login", { userId: user.id });
  redirect("/super-admin/dashboard");
}

export async function logoutSuperAdmin(): Promise<void> {
  await clearSessionCookie();
  redirect("/super-admin/login");
}

/** Prefix for certificate codes, derived from the institute name at approval. */
function derivePrefix(name: string, slug: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  const base = (letters.length >= 2 ? letters : slug.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "INST").padEnd(4, "X");
  return base.slice(0, 4);
}

async function setTenantStatus(
  tenantId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED",
  extra: { rejectedReason?: string; suspendedReason?: string } = {},
): Promise<void> {
  const session = await requireSuperAdminSession();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  const data: Record<string, unknown> = { status };
  if (status === "APPROVED") {
    data.approvedAt = new Date();
    data.approvedBy = session.userId;
    // Prefix is immutable after approval — it becomes part of every
    // certificate code this institute ever issues.
    if (!tenant.prefix) data.prefix = derivePrefix(tenant.name, tenant.slug);
  }
  if (status === "REJECTED") {
    data.rejectedReason = extra.rejectedReason ?? "Not approved";
  }
  if (status === "SUSPENDED") {
    data.suspendedReason = extra.suspendedReason ?? "Suspended by platform admin";
  }

  await prisma.tenant.update({ where: { id: tenantId }, data });
  await writePlatformAuditLog({
    actorId: session.userId,
    action: `tenant.${status.toLowerCase()}`,
    targetType: "tenant",
    targetId: tenantId,
  });
  logger.info(`superadmin.tenant_${status.toLowerCase()}`, { tenantId, by: session.userId });
}

export async function approveTenant(tenantId: string): Promise<void> {
  await setTenantStatus(tenantId, "APPROVED");
  redirect("/super-admin/dashboard");
}

export async function rejectTenant(formData: FormData): Promise<void> {
  const tenantId = String(formData.get("tenantId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!tenantId) redirect("/super-admin/dashboard");
  await setTenantStatus(tenantId, "REJECTED", { rejectedReason: reason });
  redirect("/super-admin/dashboard");
}

export async function suspendTenant(formData: FormData): Promise<void> {
  const tenantId = String(formData.get("tenantId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!tenantId) redirect("/super-admin/dashboard");
  await setTenantStatus(tenantId, "SUSPENDED", { suspendedReason: reason });
  redirect("/super-admin/dashboard");
}

export async function reactivateTenant(tenantId: string): Promise<void> {
  await setTenantStatus(tenantId, "APPROVED");
  redirect("/super-admin/dashboard");
}

// 2026-10-05: white-label premium gate. Super-admin enables/disables the
// white-label feature per institute (the institute configures domains and
// colors from their own Settings page).
export async function toggleWhiteLabel(tenantId: string, enabled: boolean): Promise<void> {
  await requireSuperAdminSession();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { whiteLabelEnabled: enabled },
  });
  redirect("/super-admin/dashboard");
}

// 2026-10-05: subscription plan management. Super-admin creates/edits/
// (de)activates the yearly institute plans.

interface PlanFormState {
  status: "ok" | "error";
  message: string;
}

function parsePlanForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priceRupees = Number(String(formData.get("priceRupees") ?? ""));
  const studentLimitRaw = String(formData.get("studentLimit") ?? "").trim().toLowerCase();
  const sortOrder = Number(String(formData.get("sortOrder") ?? "0")) || 0;
  const features = {
    bulkIssuance: formData.get("bulkIssuance") === "on",
    analytics: formData.get("analytics") === "on",
    allTemplates: formData.get("allTemplates") === "on",
    whiteLabel: formData.get("whiteLabel") === "on",
  };
  return { name, description, priceRupees, studentLimitRaw, sortOrder, features };
}

export async function createPlan(
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  await requireSuperAdminSession();
  const f = parsePlanForm(formData);
  if (!f.name) return { status: "error", message: "Plan name is required." };
  if (!Number.isFinite(f.priceRupees) || f.priceRupees < 0) {
    return { status: "error", message: "Price must be a valid non-negative number." };
  }
  const studentLimit =
    f.studentLimitRaw === "" || f.studentLimitRaw === "unlimited" || f.studentLimitRaw === "-1"
      ? -1
      : Number(f.studentLimitRaw);
  if (!Number.isInteger(studentLimit) || (studentLimit < -1)) {
    return { status: "error", message: "Student limit must be a number, or blank for unlimited." };
  }
  await prisma.plan.create({
    data: {
      id: ulid(),
      name: f.name,
      description: f.description,
      pricePaise: Math.round(f.priceRupees * 100),
      studentLimit,
      features: f.features,
      sortOrder: f.sortOrder,
    },
  });
  logger.info("superadmin.plan_created", { name: f.name });
  redirect("/super-admin/plans");
}

export async function updatePlan(
  planId: string,
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  await requireSuperAdminSession();
  const f = parsePlanForm(formData);
  if (!f.name) return { status: "error", message: "Plan name is required." };
  if (!Number.isFinite(f.priceRupees) || f.priceRupees < 0) {
    return { status: "error", message: "Price must be a valid non-negative number." };
  }
  const studentLimit =
    f.studentLimitRaw === "" || f.studentLimitRaw === "unlimited" || f.studentLimitRaw === "-1"
      ? -1
      : Number(f.studentLimitRaw);
  if (!Number.isInteger(studentLimit) || studentLimit < -1) {
    return { status: "error", message: "Student limit must be a number, or blank for unlimited." };
  }
  await prisma.plan.update({
    where: { id: planId },
    data: {
      name: f.name,
      description: f.description,
      pricePaise: Math.round(f.priceRupees * 100),
      studentLimit,
      features: f.features,
      sortOrder: f.sortOrder,
    },
  });
  logger.info("superadmin.plan_updated", { planId });
  redirect("/super-admin/plans");
}

export async function togglePlanActive(planId: string, active: boolean): Promise<void> {
  await requireSuperAdminSession();
  await prisma.plan.update({ where: { id: planId }, data: { isActive: active } });
  logger.info("superadmin.plan_toggled", { planId, active });
  redirect("/super-admin/plans");
}
