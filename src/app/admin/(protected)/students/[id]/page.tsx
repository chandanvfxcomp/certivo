import { notFound } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { markRegistrationFeePaid } from "@/app/admin/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { ResetPasswordButton } from "./reset-password-button";
import { FREE_DOWNLOADS_PER_PAYMENT } from "@/config/certificate";

function formatPaise(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await getSession();
  if (!session || session.kind !== "admin") return null;

  const student = await withTenant(session.tenantId, (tx) =>
    tx.student.findFirst({
      where: { id, tenantId: session.tenantId, deletedAt: null },
      include: { certificates: { orderBy: { issuedAt: "desc" } } },
    }),
  );
  if (!student) notFound();

  const certificate = student.certificates[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{student.fullName}</h1>
        <p className="font-mono text-sm text-neutral-500">{student.studentCode}</p>
      </div>

      {/* QA audit finding C6: markRegistrationFeePaid
          now redirects back here with ?error=not_found instead of silently
          no-op'ing when its updateMany matches zero rows. */}
      {error === "not_found" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          That action couldn&apos;t be completed — the record may have changed. Please try again.
        </p>
      )}

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Details</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Email" value={student.email ?? "—"} />
          <Row label="Phone" value={student.phone ?? "—"} />
          <Row
            label="Date of birth"
            value={student.dateOfBirth ? student.dateOfBirth.toLocaleDateString("en-IN") : "—"}
          />
          <Row label="Guardian" value={student.guardianName ?? "—"} />
          <Row
            label="Address"
            value={
              [student.addressLine1, student.city, student.state, student.pincode]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          <Row label="Status" value={student.status} />
        </dl>
      </Card>

      {/* QA audit finding F2: CardFooter was exported but never used
          anywhere — this action button is the natural fit for it, since
          it's a footer action separate from the card's descriptive
          content, not more body copy. */}
      <Card>
        <CardHeader>
          <CardTitle>Login access</CardTitle>
          <CardDescription>
            Passwords are hashed and never stored in plaintext, so there&apos;s no existing
            password to display here — issue a fresh one whenever the student needs it.
          </CardDescription>
        </CardHeader>
        {student.userId && (
          <CardFooter>
            <ResetPasswordButton studentId={student.id} />
          </CardFooter>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Registration fee</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm">
            {formatPaise(student.registrationFeePaise)} —{" "}
            {student.registrationFeePaise == null ? (
              "not set"
            ) : student.registrationFeePaid ? (
              <span className="text-success-500">Paid</span>
            ) : (
              <span className="text-warning-500">Pending</span>
            )}
          </p>
          {student.registrationFeePaise != null && !student.registrationFeePaid && (
            <form action={markRegistrationFeePaid.bind(null, student.id)}>
              <SubmitButton pendingText="Marking paid…" size="sm">
                Mark paid
              </SubmitButton>
            </form>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Certificate</h2>
        {certificate ? (
          <div className="flex flex-col gap-3 text-sm">
            <Row label="Code" value={certificate.code} mono />
            <Row label="Status" value={certificate.status} />
            <Row label="Course" value={certificate.courseNameSnapshot} />
            <Row
              label="Completion date"
              value={certificate.completionDate ? certificate.completionDate.toLocaleDateString("en-IN") : "—"}
            />
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-900">
              <p className="text-sm text-neutral-500">
                Downloads used: {certificate.downloadCount} of {FREE_DOWNLOADS_PER_PAYMENT} free
              </p>
            </div>
            <a
              href={`/v/${certificate.code}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 underline underline-offset-2 dark:text-brand-400"
            >
              View public verification page
            </a>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No certificate on file.</p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </div>
  );
}
