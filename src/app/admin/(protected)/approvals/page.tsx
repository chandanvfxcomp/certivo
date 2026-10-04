// src/app/admin/(protected)/approvals/page.tsx
//
// Pending registration approvals — students who paid their registration
// fee but haven't been approved yet. Approving activates their certificate
// download and emails them.
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { approveRegistration } from "./actions";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

function formatPaise(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session || session.kind !== "admin") return null; // layout already guards this

  const pending = await withTenant(session.tenantId, (tx) =>
    tx.student.findMany({
      where: {
        tenantId: session.tenantId,
        deletedAt: null,
        registrationFeePaid: true,
        approvedAt: null,
      },
      orderBy: { registrationFeePaidAt: "asc" },
      select: {
        id: true,
        fullName: true,
        studentCode: true,
        email: true,
        phone: true,
        registrationFeePaise: true,
        registrationFeePaidAt: true,
        invoiceNumber: true,
      },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pending approvals</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Students who paid the registration fee and are waiting for approval. Approving
          activates their certificate download immediately.
        </p>
      </div>

      {pending.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-neutral-500">
            Nothing to approve right now. Paid registrations will appear here.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Fee paid</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Paid at</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.fullName}</div>
                    <div className="text-xs text-neutral-500">{s.email ?? s.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.studentCode}</td>
                  <td className="px-4 py-3">{formatPaise(s.registrationFeePaise)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {s.registrationFeePaidAt?.toLocaleDateString("en-IN") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={approveRegistration.bind(null, s.id)}>
                      <SubmitButton pendingText="Approving…" size="sm">
                        Approve
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
