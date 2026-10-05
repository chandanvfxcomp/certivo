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

export async function loginSuperAdmin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/super-admin/login?error=missing");

  const rateLimitKey = `superadmin:${await getClientIp()}:${email}`;
  if (isRateLimited(rateLimitKey)) {
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
  resetRateLimit(rateLimitKey);
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
