import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.kind !== "admin") return null; // layout already guards this

  const [
    studentCount,
    certificateCount,
    unpaidRegistrations,
    totalDownloads,
    revenuePaise,
    revokedCount,
    recentIssued,
  ] = await withTenant(session.tenantId, async (tx) =>
    Promise.all([
      tx.student.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
      tx.certificate.count({ where: { tenantId: session.tenantId, status: "ACTIVE" } }),
      tx.student.count({
        where: {
          tenantId: session.tenantId,
          deletedAt: null,
          registrationFeePaise: { not: null },
          registrationFeePaid: false,
        },
      }),
      tx.certificate.aggregate({
        where: { tenantId: session.tenantId },
        _sum: { downloadCount: true },
      }),
      // Revenue: paid registration fees (institute's money).
      Promise.all([
        tx.student.aggregate({
          where: { tenantId: session.tenantId, registrationFeePaid: true },
          _sum: { registrationFeePaise: true },
        }),
      ]).then(([reg]) => reg._sum.registrationFeePaise ?? 0),
      tx.certificate.count({ where: { tenantId: session.tenantId, status: "REVOKED" } }),
      // Last 14 days of issuance, for the mini chart.
      tx.certificate.findMany({
        where: {
          tenantId: session.tenantId,
          issuedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
        select: { issuedAt: true },
      }),
    ]),
  );

  // Bucket issuance by calendar day.
  const days: { label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const count = recentIssued.filter((r) => r.issuedAt.toISOString().slice(0, 10) === key).length;
    days.push({ label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const stats = [
    { label: "Students registered", value: String(studentCount) },
    { label: "Certificates issued", value: String(certificateCount) },
    { label: "Total downloads", value: String(totalDownloads._sum.downloadCount ?? 0) },
    { label: "Revenue collected", value: formatPaise(revenuePaise) },
    { label: "Registration fees pending", value: String(unpaidRegistrations) },
    { label: "Revoked", value: String(revokedCount) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/students/bulk">
            <Button variant="outline">Bulk issue (CSV)</Button>
          </Link>
          <Link href="/admin/students/new">
            <Button>Register a student</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-neutral-500">{s.label}</CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Certificates issued — last 14 days</h2>
        {days.every((d) => d.count === 0) ? (
          <p className="text-sm text-neutral-500">No certificates issued in the last 14 days.</p>
        ) : (
          <div className="flex items-end gap-1.5" role="img" aria-label="Bar chart of certificates issued per day">
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.count}`}>
                <div
                  className="w-full rounded-t bg-neutral-900 dark:bg-neutral-100"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 96)}px` }}
                />
                <span className="text-[10px] text-neutral-400">{d.label.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
