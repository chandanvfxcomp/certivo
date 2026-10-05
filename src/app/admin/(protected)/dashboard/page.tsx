import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { getReferralStats } from "@/server/referrals/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton, WhatsAppShareButton } from "./referral-buttons";

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

  const referral = await getReferralStats(session.tenantId);

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

      {/* Referral program */}
      <Card className="p-6">
        <h2 className="font-semibold">Refer &amp; earn free days</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Invite other institutes. When one pays for their first subscription plan,
          you get <span className="font-semibold text-neutral-700 dark:text-neutral-300">30 days free</span> added
          to your subscription.
        </p>

        {referral.referralCode && referral.shareUrl ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-4 py-2 dark:bg-neutral-900">
                <span className="text-xs text-neutral-500">Your code</span>
                <span className="font-mono text-lg font-bold tracking-widest">
                  {referral.referralCode}
                </span>
                <CopyButton text={referral.referralCode} label="Copy code" />
              </div>
              <WhatsAppShareButton shareUrl={referral.shareUrl} />
              <CopyButton text={referral.shareUrl} label="Copy link" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
                <div className="text-2xl font-bold">{referral.totalReferred}</div>
                <div className="text-sm text-neutral-500">Institutes referred</div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
                <div className="text-2xl font-bold">{referral.paidCount}</div>
                <div className="text-sm text-neutral-500">Paid subscriptions</div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900">
                <div className="text-2xl font-bold">{referral.totalDaysEarned}</div>
                <div className="text-sm text-neutral-500">Free days earned</div>
              </div>
            </div>

            {referral.referrals.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
                      <th className="py-2 pr-4 font-medium">Institute</th>
                      <th className="py-2 pr-4 font-medium">Registered</th>
                      <th className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referral.referrals.map((r) => (
                      <tr key={`${r.instituteName}-${r.registeredAt.toISOString()}`} className="border-b border-neutral-100 dark:border-neutral-900">
                        <td className="py-2 pr-4">{r.instituteName}</td>
                        <td className="py-2 pr-4 text-neutral-500">
                          {r.registeredAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              r.status === "paid"
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
                            }`}
                          >
                            {r.status === "paid" ? "Paid" : "Registered"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            Your referral code is being set up — check back shortly.
          </p>
        )}
      </Card>
    </div>
  );
}
