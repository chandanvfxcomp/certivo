import { prisma } from "@/server/db/client";
import { requireSuperAdminSession } from "@/server/auth/session";
import {
  approveTenant,
  rejectTenant,
  suspendTenant,
  reactivateTenant,
} from "@/app/super-admin/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    REJECTED: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400",
    SUSPENDED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? styles.REJECTED}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default async function SuperAdminDashboardPage() {
  await requireSuperAdminSession();

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { students: true } } },
  });
  const pending = tenants.filter((t) => t.status === "PENDING").length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Institutes</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-3xl font-bold">{tenants.length}</div>
          <div className="mt-1 text-sm text-neutral-500">Total institutes</div>
        </Card>
        <Card className="p-5">
          <div className="text-3xl font-bold">{pending}</div>
          <div className="mt-1 text-sm text-neutral-500">Pending approval</div>
        </Card>
        <Card className="p-5">
          <div className="text-3xl font-bold">
            {tenants.reduce((n, t) => n + t._count.students, 0)}
          </div>
          <div className="mt-1 text-sm text-neutral-500">Total students (all institutes)</div>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-4 py-3 font-medium">Institute</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Students</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.name}</div>
                  <div className="font-mono text-xs text-neutral-500">{t.slug}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  <div>{t.ownerName}</div>
                  <div className="text-xs">{t.ownerEmail}</div>
                  <div className="text-xs">{t.ownerPhone}</div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3">{t._count.students}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {t.createdAt.toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {t.status === "PENDING" && (
                      <>
                        <form action={approveTenant.bind(null, t.id)}>
                          <Button size="sm">Approve</Button>
                        </form>
                        <form action={rejectTenant} className="flex gap-2">
                          <input type="hidden" name="tenantId" value={t.id} />
                          <Input name="reason" placeholder="Reason (optional)" className="h-8 w-36 text-xs" />
                          <Button size="sm" variant="outline" type="submit">
                            Reject
                          </Button>
                        </form>
                      </>
                    )}
                    {t.status === "APPROVED" && (
                      <form action={suspendTenant} className="flex gap-2">
                        <input type="hidden" name="tenantId" value={t.id} />
                        <Input name="reason" placeholder="Reason (optional)" className="h-8 w-36 text-xs" />
                        <Button size="sm" variant="outline" type="submit">
                          Suspend
                        </Button>
                      </form>
                    )}
                    {(t.status === "SUSPENDED" || t.status === "REJECTED") && (
                      <form action={reactivateTenant.bind(null, t.id)}>
                        <Button size="sm" variant="outline">
                          Reactivate
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No institutes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
