// src/server/leads/service.ts
//
// Lead capture + follow-up scheduling. When a lead is created, one
// FollowUpLog row is scheduled per ENABLED template — the sender cron
// picks up rows whose template delay has elapsed.
import { prisma } from "@/server/db/client";
import { ulid } from "@/lib/ulid";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  instituteName?: string;
  message?: string;
  source?: string;
}

export async function createLead(input: CreateLeadInput): Promise<{ id: string }> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 100) throw new Error("Please enter your name");
  const instituteName = input.instituteName?.trim() || null;
  // Institute-only funnel: every lead must name their institute/coaching.
  if (!instituteName || instituteName.length < 2) {
    throw new Error("Please enter your institute / coaching name");
  }
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  if (!email && !phone) throw new Error("Please provide an email or phone number");
  if (email && !isValidEmail(email)) throw new Error("Please enter a valid email");
  if (phone && !isValidIndianMobile(phone)) throw new Error("Please enter a valid 10-digit mobile number");

  const lead = await prisma.lead.create({
    data: {
      id: ulid(),
      name,
      email,
      phone,
      instituteName,
      message: input.message?.trim().slice(0, 2000) || null,
      source: input.source?.slice(0, 50) ?? "landing",
    },
  });

  // Schedule one follow-up per enabled template.
  const templates = await prisma.followUpTemplate.findMany({ where: { enabled: true } });
  if (templates.length > 0) {
    await prisma.followUpLog.createMany({
      data: templates.map((t) => ({
        id: ulid(),
        leadId: lead.id,
        templateId: t.id,
        channel: t.channel,
      })),
    });
  }

  return { id: lead.id };
}

export async function getLeads(filter?: { status?: string }): Promise<
  Array<{
    id: string; name: string; email: string | null; phone: string | null;
    instituteName: string | null; source: string; status: string; createdAt: Date;
    sentCount: number; totalCount: number;
  }>
> {
  const leads = await prisma.lead.findMany({
    where: filter?.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { followUps: { select: { status: true } } },
  });
  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    instituteName: l.instituteName,
    source: l.source,
    status: l.status,
    createdAt: l.createdAt,
    sentCount: l.followUps.filter((f) => f.status === "SENT").length,
    totalCount: l.followUps.length,
  }));
}

export async function setLeadStatus(id: string, status: string): Promise<void> {
  const allowed = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
  if (!allowed.includes(status)) throw new Error("Invalid status");
  await prisma.lead.update({ where: { id }, data: { status } });
}
