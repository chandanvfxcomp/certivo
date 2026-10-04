import { requireSuperAdminSession } from "@/server/auth/session";
import { getVisitStats } from "@/server/visits/tracker";
import { Card } from "@/components/ui/card";

// Super admin → Visits: anonymous visit analytics.
export default async function VisitsPage() {
  await requireSuperAdminSession();
  const stats = await getVisitStats();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Site visits</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Anonymous page-view counts (IPs are hashed). Tracking is silent and never blocks pages.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-3xl font-bold">{stats.today}</div>
          <div className="mt-1 text-sm text-neutral-500">Visits today</div>
        </Card>
        <Card className="p-5">
          <div className="text-3xl font-bold">{stats.last7Days}</div>
          <div className="mt-1 text-sm text-neutral-500">Last 7 days</div>
        </Card>
        <Card className="p-5">
          <div className="text-3xl font-bold">{stats.last30Days}</div>
          <div className="mt-1 text-sm text-neutral-500">Last 30 days</div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Top pages (30 days)</h2>
        {stats.byPath.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No visits tracked yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stats.byPath.map((r) => (
              <li key={r.path} className="flex items-center justify-between gap-4 text-sm">
                <code className="truncate rounded bg-neutral-100 px-2 py-0.5 dark:bg-neutral-900">{r.path}</code>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
