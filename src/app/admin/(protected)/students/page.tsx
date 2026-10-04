import Link from "next/link";
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// QA audit finding A8: the list used a hard `take: 100` with no page
// controls and no total count — past 100 students, the rest were simply
// invisible with no indication anything was cut off. Real page-based
// pagination (page number in the URL, so it's linkable/back-buttonable)
// replaces the hidden cap.
const PAGE_SIZE = 25;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session || session.kind !== "admin") return null;

  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.floor(requestedPage) : 1;

  const [students, totalCount] = await withTenant(session.tenantId, (tx) =>
    Promise.all([
      tx.student.findMany({
        where: { tenantId: session.tenantId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          studentCode: true,
          fullName: true,
          registrationFeePaise: true,
          registrationFeePaid: true,
          certificates: { select: { status: true }, take: 1 },
        },
      }),
      tx.student.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
    ]),
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Students</h1>
        <div className="flex gap-2">
          <Link href="/admin/students/bulk">
            <Button variant="outline">Bulk issue (CSV)</Button>
          </Link>
          <Link href="/admin/students/new">
            <Button>Register a student</Button>
          </Link>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="p-8 text-center text-neutral-500">
          No students registered yet.
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Registration fee</th>
                <th className="px-4 py-3 font-medium">Certificate</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                  <td className="px-4 py-3 font-mono text-xs">{s.studentCode}</td>
                  <td className="px-4 py-3">{s.fullName}</td>
                  <td className="px-4 py-3">
                    {s.registrationFeePaise == null ? (
                      <span className="text-neutral-400">—</span>
                    ) : s.registrationFeePaid ? (
                      <span className="text-success-500">Paid</span>
                    ) : (
                      <span className="text-warning-500">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.certificates[0]?.status === "ACTIVE" ? "Issued" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/students/${s.id}`} className="text-brand-600 underline underline-offset-2 dark:text-brand-400">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Page {page} of {totalPages} ({totalCount} student{totalCount === 1 ? "" : "s"} total)
          </span>
          <div className="flex gap-2">
            <Link
              href={`/admin/students?page=${Math.max(1, page - 1)}`}
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-40" : undefined}
            >
              <Button type="button" variant="outline" disabled={page <= 1}>
                Previous
              </Button>
            </Link>
            <Link
              href={`/admin/students?page=${Math.min(totalPages, page + 1)}`}
              aria-disabled={page >= totalPages}
              className={page >= totalPages ? "pointer-events-none opacity-40" : undefined}
            >
              <Button type="button" variant="outline" disabled={page >= totalPages}>
                Next
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
