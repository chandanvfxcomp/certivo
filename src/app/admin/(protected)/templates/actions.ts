"use server";

// src/app/admin/(protected)/templates/actions.ts
//
// Select the institute's active certificate template.
import { requireAdminSession } from "@/server/auth/session";
import { setActiveTemplate } from "@/server/certificates/template-service";

export async function selectTemplateAction(templateId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireAdminSession();
    await setActiveTemplate(session.tenantId, templateId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not select template" };
  }
}
