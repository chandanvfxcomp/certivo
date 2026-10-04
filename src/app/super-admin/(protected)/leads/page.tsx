import { requireSuperAdminSession } from "@/server/auth/session";
import { getLeads, setLeadStatus } from "@/server/leads/service";
import { sendDueFollowUps } from "@/server/leads/followup-sender";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Super admin → Leads: captured contacts + follow-up progress.
export default async function LeadsPage() {
  await requireSuperAdminSession();
  const leads = await getLeads();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Contacts captured from the landing page. Follow-up emails send automatically per the enabled templates.
          </p>
        </div>
        <form action={sendNow}>
          <Button type="submit" variant="outline" size="sm">
            Send due follow-ups now
          </Button>
        </form>
      </div>

      <Card className="mt-6 overflow-x-auto">
        {leads.length === 0 ? (
          <p className="p-5 text-sm text-neutral-500">No leads yet — they appear here when someone requests a callback.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Contact</th>
                <th className="p-3 font-medium">Institute</th>
                <th className="p-3 font-medium">Follow-ups</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{l.name}</td>
                  <td className="p-3 text-neutral-600">
                    {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="p-3">{l.instituteName ?? "—"}</td>
                  <td className="p-3 tabular-nums">
                    {l.sentCount}/{l.totalCount} sent
                  </td>
                  <td className="p-3">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {(["CONTACTED", "CONVERTED", "CLOSED"] as const).map((s) =>
                        l.status !== s ? (
                          <form key={s} action={setStatus.bind(null, l.id, s)}>
                            <Button type="submit" variant="ghost" size="sm">
                              {s.charAt(0) + s.slice(1).toLowerCase()}
                            </Button>
                          </form>
                        ) : null,
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    CONTACTED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    CONVERTED: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    CLOSED: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? styles.CLOSED}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

async function setStatus(id: string, status: string) {
  "use server";
  await requireSuperAdminSession();
  await setLeadStatus(id, status);
}

async function sendNow() {
  "use server";
  await requireSuperAdminSession();
  await sendDueFollowUps();
}
