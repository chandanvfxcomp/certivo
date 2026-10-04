import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getSession, clearSessionCookie } from "@/server/auth/session";
import { withTenant } from "@/server/db/tenant-client";
import { payPlatformFee, setDirectoryOptIn } from "@/app/student/actions";
import { FREE_DOWNLOADS_PER_PAYMENT, PLATFORM_REDOWNLOAD_FEE_PAISE } from "@/config/certificate";
import { isRazorpayConfigured } from "@/server/payments/razorpay";
import { isCashfreeConfigured } from "@/server/payments/cashfree";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { PayWithProvider } from "@/components/pay-with-provider";
import { linkedInAddToProfileUrl } from "@/lib/linkedin";

function formatPaise(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function StudentPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getSession();
  if (!session || session.kind !== "student") return null; // layout already guards this

  // QA audit finding H1: this findFirstOrThrow was unguarded — a stale
  // session cookie for a student row that no longer exists (deleted,
  // or a rare cross-tenant mismatch) crashed straight into the generic
  // error.tsx boundary (see A2) with no way forward except a manual
  // "clear cookies." Mapping the specific P2025 case to a session clear
  // + redirect turns that into the same graceful "sign in again" outcome
  // the rest of the app already gives for an expired session — a
  // meaningfully better, specific error state, not just "not a crash."
  let student;
  try {
    student = await withTenant(session.tenantId, (tx) =>
      tx.student.findFirstOrThrow({
        where: { id: session.studentId, tenantId: session.tenantId, deletedAt: null },
        include: { certificates: { where: { status: "ACTIVE" }, orderBy: { issuedAt: "desc" }, take: 1 } },
      }),
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      await clearSessionCookie();
      redirect("/student/login?error=session_expired");
    }
    throw err; // anything else is unexpected — let error.tsx handle it
  }
  const certificate = student.certificates[0] ?? null;
  // The certificate exists the moment it's issued — the student always
  // gets to see it. Money is only charged on downloads (2 free, then
  // ₹299 platform fee per download).
  // Platform per-download fee state: once the 2 free downloads are used,
  // EACH further download costs the fixed ₹299 platform fee (one payment
  // = one download).
  const downloadsExhausted =
    certificate != null &&
    certificate.downloadCount >= FREE_DOWNLOADS_PER_PAYMENT &&
    !certificate.platformFeePaid;
  const downloadsLeft = certificate
    ? Math.max(0, FREE_DOWNLOADS_PER_PAYMENT - certificate.downloadCount)
    : 0;
  const onlinePayEnabled = isRazorpayConfigured() || isCashfreeConfigured(); // manual fallback shows only when no provider configured

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {student.fullName}</h1>
        <p className="font-mono text-sm text-neutral-500">{student.studentCode}</p>
      </div>

      {error === "not_found" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          That payment couldn&apos;t be completed — the certificate may have changed. Please try again.
        </p>
      )}

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Your certificate</h2>
        {certificate ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Course</dt>
                <dd>{certificate.courseNameSnapshot}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Certificate code</dt>
                <dd className="font-mono">{certificate.code}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Completion date</dt>
                <dd>
                  {certificate.completionDate
                    ? certificate.completionDate.toLocaleDateString("en-IN")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-500">Status</dt>
                <dd className="text-success-500">Active</dd>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {downloadsExhausted ? (
                <div className="flex flex-col gap-3">
                  <PayWithProvider
                    certificateId={certificate.id}
                    amountLabel={formatPaise(PLATFORM_REDOWNLOAD_FEE_PAISE)}
                    onPaid={() => window.location.reload()}
                  />
                  <form action={payPlatformFee.bind(null, certificate.id)}>
                    <SubmitButton pendingText="Processing…" variant="outline" size="sm">
                      {onlinePayEnabled
                        ? "Or mark paid manually"
                        : `Pay ${formatPaise(PLATFORM_REDOWNLOAD_FEE_PAISE)} now`}
                    </SubmitButton>
                  </form>
                  {!onlinePayEnabled && (
                    <p className="text-xs text-neutral-500">
                      Online payment isn&apos;t set up yet — this marks the fee paid directly.
                    </p>
                  )}
                </div>
              ) : (
                <a href="/student/portal/certificate">
                  <Button>Download PDF</Button>
                </a>
              )}
              <a href={`/v/${certificate.code}`} target="_blank" rel="noreferrer">
                <Button variant="outline">View public verification page</Button>
              </a>
              <a
                href={linkedInAddToProfileUrl({
                  courseName: certificate.courseNameSnapshot,
                  instituteName: certificate.instituteNameSnapshot,
                  certificateCode: certificate.code,
                  issueDate: certificate.issuedAt,
                })}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline">Add to LinkedIn</Button>
              </a>
            </div>
            <p className="text-xs text-neutral-500">
              {downloadsExhausted
                ? `You've used your ${FREE_DOWNLOADS_PER_PAYMENT} free downloads — each further download costs ₹299.`
                : downloadsLeft > 0
                  ? `${downloadsLeft} of ${FREE_DOWNLOADS_PER_PAYMENT} free downloads left.`
                  : `Each download costs ₹299 from here.`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            No certificate has been issued yet — check back once your institute completes the
            process.
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Fees</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Registration fee</dt>
            <dd>
              {formatPaise(student.registrationFeePaise)}
              {student.registrationFeePaise != null && (
                <span className={student.registrationFeePaid ? "text-success-500" : "text-warning-500"}>
                  {" "}
                  ({student.registrationFeePaid ? "Paid" : "Pending"})
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Downloads</dt>
            <dd>
              {certificate
                ? `${Math.max(0, FREE_DOWNLOADS_PER_PAYMENT - certificate.downloadCount)} of ${FREE_DOWNLOADS_PER_PAYMENT} free left`
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-neutral-500">
          Payments are collected by your institute directly for now — this page reflects what
          they&apos;ve recorded, transparently, as it&apos;s updated.
        </p>
      </Card>

      {certificate && (
        <Card className="p-6">
          <h2 className="font-semibold">Public directory</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {certificate.directoryOptIn
              ? "Your certificate is listed publicly with your name, course, and institute."
              : "Opt in to appear in the public certificate directory — only your name, course, institute, and a verify link are shown."}
          </p>
          <form action={setDirectoryOptIn.bind(null, certificate.id, !certificate.directoryOptIn)} className="mt-3">
            <SubmitButton pendingText="Saving…" variant="outline" size="sm">
              {certificate.directoryOptIn ? "Remove me from the directory" : "List me publicly"}
            </SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
