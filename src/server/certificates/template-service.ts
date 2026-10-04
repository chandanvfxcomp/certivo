// src/server/certificates/template-service.ts
//
// Business logic for the 10-template system:
// - which templates a tenant can use (free always, premium iff unlocked)
// - selecting the active template
// - recording a premium unlock after successful payment
import { prisma } from "@/server/db/client";
import { ulid } from "@/lib/ulid";
import {
  TEMPLATE_CATALOG,
  FREE_TEMPLATE_ID,
  DEFAULT_TEMPLATE_ID,
  getTemplateMeta,
  isTemplateId,
} from "./templates/registry";
import type { TemplateMeta } from "./templates/types";

export interface TenantTemplateInfo extends TemplateMeta {
  unlocked: boolean;
  active: boolean;
}

/** Full gallery state for one tenant. */
export async function getTenantTemplates(tenantId: string): Promise<TenantTemplateInfo[]> {
  const [tenant, unlocks] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { activeTemplateId: true } }),
    prisma.tenantTemplateUnlock.findMany({ where: { tenantId }, select: { templateId: true } }),
  ]);
  const unlockedSet = new Set(unlocks.map((u) => u.templateId));
  const activeId = tenant?.activeTemplateId ?? DEFAULT_TEMPLATE_ID;
  return TEMPLATE_CATALOG.map((meta) => ({
    ...meta,
    unlocked: meta.tier === "free" || unlockedSet.has(meta.id),
    active: meta.id === activeId,
  }));
}

/** Can this tenant's certificates render with this template right now? */
export async function canUseTemplate(tenantId: string, templateId: string): Promise<boolean> {
  if (!isTemplateId(templateId)) return false;
  if (templateId === FREE_TEMPLATE_ID) return true;
  const unlock = await prisma.tenantTemplateUnlock.findUnique({
    where: { tenantId_templateId: { tenantId, templateId } },
    select: { id: true },
  });
  return unlock !== null;
}

/** Resolve the template id actually used for a download (falls back to free). */
export async function resolveDownloadTemplateId(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { activeTemplateId: true },
  });
  const wanted = tenant?.activeTemplateId ?? DEFAULT_TEMPLATE_ID;
  if (await canUseTemplate(tenantId, wanted)) return wanted;
  return DEFAULT_TEMPLATE_ID;
}

/**
 * Select the active template. Throws if the template is premium and not
 * unlocked — the UI must route through the unlock payment flow first.
 */
export async function setActiveTemplate(tenantId: string, templateId: string): Promise<void> {
  if (!isTemplateId(templateId)) throw new Error("Unknown template");
  const meta = getTemplateMeta(templateId);
  if (meta.tier === "premium" && !(await canUseTemplate(tenantId, templateId))) {
    throw new Error("Template is locked — unlock it first");
  }
  await prisma.tenant.update({ where: { id: tenantId }, data: { activeTemplateId: templateId } });
  await prisma.auditLog.create({
    data: {
      id: ulid(),
      tenantId,
      actorId: null,
      action: "TEMPLATE_SELECTED",
      targetType: "Tenant",
      targetId: tenantId,
      after: { templateId },
    },
  });
}

/** Record a premium unlock after a verified payment. Idempotent. */
export async function unlockTemplate(
  tenantId: string,
  templateId: string,
  paymentRef: string | null,
): Promise<void> {
  if (!isTemplateId(templateId)) throw new Error("Unknown template");
  const meta = getTemplateMeta(templateId);
  if (meta.tier === "free") return; // nothing to unlock
  await prisma.tenantTemplateUnlock.upsert({
    where: { tenantId_templateId: { tenantId, templateId } },
    create: { id: ulid(), tenantId, templateId, paymentRef },
    update: { paymentRef },
  });
  await prisma.auditLog.create({
    data: {
      id: ulid(),
      tenantId,
      actorId: null,
      action: "TEMPLATE_UNLOCKED",
      targetType: "Tenant",
      targetId: tenantId,
      after: { templateId, paymentRef },
    },
  });
}

export { TEMPLATE_CATALOG, FREE_TEMPLATE_ID, DEFAULT_TEMPLATE_ID, getTemplateMeta };
