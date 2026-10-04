import { revalidatePath } from "next/cache";
import { requireSuperAdminSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { ulid } from "@/lib/ulid";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Super admin → Follow-ups: edit the automated message sequence.
// Variables: {{name}}, {{institute}}, {{email}}.
export default async function FollowUpsPage() {
  await requireSuperAdminSession();
  const templates = await prisma.followUpTemplate.findMany({ orderBy: { delayDays: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Follow-up messages</h1>
      <p className="mt-1 max-w-2xl text-sm text-neutral-500">
        Follow-ups <span className="font-medium">sirf institute/coaching owners</span> ko jate hain —
        har naye lead ko uske enabled templates ke hisab se{" "}
        <span className="font-medium">delayDays</span> baad message milta hai. Use{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">{"{{name}}"}</code>,{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">{"{{institute}}"}</code> as
        placeholders. Disable a template to stop it (already-scheduled messages are skipped).
      </p>
      {templates.length === 0 && (
        <Card className="mt-4 border-dashed p-5">
          <p className="text-sm text-neutral-600">
            Koi template nahi hai abhi — ek click me institute-focused default sequence (Day 0 / 2 / 7) load karo:
          </p>
          <form action={loadDefaults} className="mt-3">
            <Button type="submit">Load default templates</Button>
          </form>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {templates.map((t) => (
          <Card key={t.id} className="p-5">
            <form action={saveTemplate.bind(null, t.id)} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input name="name" defaultValue={t.name} className="max-w-xs font-semibold" aria-label="Template name" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="enabled" defaultChecked={t.enabled} className="h-4 w-4" />
                  Enabled
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Subject</span>
                  <Input name="subject" defaultValue={t.subject} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Send after (days)</span>
                  <Input name="delayDays" type="number" min={0} max={90} defaultValue={t.delayDays} />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Message</span>
                <textarea
                  name="body"
                  defaultValue={t.body}
                  rows={5}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Save</Button>
              </div>
            </form>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Add a new message</h2>
        <form action={addTemplate} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input name="name" placeholder="Template name (e.g. Day 14 nudge)" required />
          <Input name="delayDays" type="number" min={0} max={90} defaultValue={14} aria-label="Send after (days)" />
          <Input name="subject" placeholder="Subject" required className="sm:col-span-2" />
          <textarea
            name="body"
            placeholder="Message (supports {{name}}, {{institute}})"
            rows={4}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm sm:col-span-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" variant="outline">Add template</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

async function saveTemplate(id: string, formData: FormData) {
  "use server";
  await requireSuperAdminSession();
  const delayDays = Math.max(0, Math.min(90, Number(formData.get("delayDays")) || 0));
  await prisma.followUpTemplate.update({
    where: { id },
    data: {
      name: String(formData.get("name")).slice(0, 100),
      subject: String(formData.get("subject")).slice(0, 200),
      body: String(formData.get("body")).slice(0, 5000),
      delayDays,
      enabled: formData.get("enabled") === "on",
    },
  });
  revalidatePath("/super-admin/followups");
}

async function addTemplate(formData: FormData) {
  "use server";
  await requireSuperAdminSession();
  await prisma.followUpTemplate.create({
    data: {
      id: ulid(),
      name: String(formData.get("name")).slice(0, 100),
      subject: String(formData.get("subject")).slice(0, 200),
      body: String(formData.get("body")).slice(0, 5000),
      delayDays: Math.max(0, Math.min(90, Number(formData.get("delayDays")) || 0)),
      channel: "email",
      enabled: true,
    },
  });
  revalidatePath("/super-admin/followups");
}

// One-click: load the default institute-focused sequence (Day 0/2/7).
// Skips templates whose name already exists — safe to run twice.
async function loadDefaults() {
  "use server";
  await requireSuperAdminSession();
  const { DEFAULT_FOLLOWUP_TEMPLATES } = await import("@/server/leads/default-templates");
  const existing = await prisma.followUpTemplate.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((t) => t.name));
  const fresh = DEFAULT_FOLLOWUP_TEMPLATES.filter((t) => !existingNames.has(t.name));
  if (fresh.length > 0) {
    await prisma.followUpTemplate.createMany({
      data: fresh.map((t) => ({
        id: ulid(),
        name: t.name,
        channel: t.channel,
        delayDays: t.delayDays,
        subject: t.subject,
        body: t.body,
        enabled: true,
      })),
    });
  }
  revalidatePath("/super-admin/followups");
}
