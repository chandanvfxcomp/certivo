// src/server/leads/followup-sender.ts
//
// Sends due follow-up messages. A FollowUpLog row is "due" when
// lead.createdAt + template.delayDays <= now and status is PENDING.
// Run from a cron (scripts/send-followups.ts) or the super-admin "Send now".
import { prisma } from "@/server/db/client";
import { sendEmail } from "@/server/email/client";
import { renderTemplate } from "./templates";
import { logger } from "@/lib/logger";

export interface SendResult {
  attempted: number;
  sent: number;
  failed: number;
}

/** Send all due follow-ups. Returns counts. Never throws. */
export async function sendDueFollowUps(limit = 100): Promise<SendResult> {
  const result: SendResult = { attempted: 0, sent: 0, failed: 0 };
  const now = new Date();

  const pending = await prisma.followUpLog.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      lead: true,
      template: true,
    },
  });

  for (const log of pending) {
    // Skip if the template was disabled after scheduling.
    if (!log.template.enabled) {
      await prisma.followUpLog.update({ where: { id: log.id }, data: { status: "SKIPPED" } });
      continue;
    }
    // Due check: lead.createdAt + delayDays <= now.
    const dueAt = new Date(log.lead.createdAt);
    dueAt.setDate(dueAt.getDate() + log.template.delayDays);
    if (dueAt > now) continue;
    // Don't message converted/closed leads.
    if (log.lead.status === "CONVERTED" || log.lead.status === "CLOSED") {
      await prisma.followUpLog.update({ where: { id: log.id }, data: { status: "SKIPPED" } });
      continue;
    }

    result.attempted++;
    try {
      await sendOne(log.id, log.lead, log.template);
      result.sent++;
    } catch (err) {
      result.failed++;
      const message = err instanceof Error ? err.message : "send failed";
      logger.warn("followup.send_failed", { logId: log.id, message });
      await prisma.followUpLog.update({
        where: { id: log.id },
        data: { status: "FAILED", error: message.slice(0, 500) },
      });
    }
  }
  return result;
}

async function sendOne(
  logId: string,
  lead: { name: string; email: string | null; phone: string | null; instituteName: string | null },
  template: { subject: string; body: string; channel: string },
): Promise<void> {
  const vars = { name: lead.name, email: lead.email, institute: lead.instituteName };
  const subject = renderTemplate(template.subject, vars);
  const text = renderTemplate(template.body, vars);

  if (template.channel === "email") {
    if (!lead.email) throw new Error("lead has no email");
    const html = `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap;">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\n/g, "<br/>")}</div>`;
    const sent = await sendEmail({ to: lead.email, subject, html, text });
    if (!sent) throw new Error("email provider failed");
  } else {
    // WhatsApp/SMS channel: provider not connected yet — the super admin
    // sees these as FAILED with a clear reason instead of silent loss.
    throw new Error(`channel "${template.channel}" not connected — connect a WhatsApp provider`);
  }

  await prisma.followUpLog.update({
    where: { id: logId },
    data: { status: "SENT", sentAt: new Date() },
  });
}
