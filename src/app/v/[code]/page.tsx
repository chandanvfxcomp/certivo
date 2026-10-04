import Link from "next/link";
import { findPublicCertificateByCode } from "@/server/db/certificate-public";
import { generateQrMatrix } from "@/lib/qrcode";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/config/brand";
import { VerifyActions } from "./verify-actions";

// Public verification page — NO login, NO tenant context. Reads only
// through certificate_public (src/server/db/certificate-public.ts), which
// is itself the safety boundary: this page cannot render Student's PII
// even by mistake, because that data was never fetched.

function QrSvg({ text, size = 128 }: { text: string; size?: number }) {
  let matrix;
  try {
    matrix = generateQrMatrix(text, "M");
  } catch {
    return null;
  }
  const m = matrix;
  const cell = size / m.size;
  const rects = [];
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.isDark(r, c)) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cell}
            y={r * cell}
            width={cell + 0.03}
            height={cell + 0.03}
          />,
        );
      }
    }
  }
  return (
    <span
      className="inline-block rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800"
      role="img"
      aria-label="QR code linking to this verification page"
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
        {rects}
      </svg>
    </span>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-2 dark:border-neutral-900">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={mono ? "font-mono" : "font-medium"}>{value}</dd>
    </div>
  );
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const certificate = await findPublicCertificateByCode(code);
  const checkedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="text-sm font-semibold">
            {BRAND.name}
          </Link>
          <h1 className="mt-4 text-lg font-semibold">Certificate verification</h1>
          <p className="mt-1 text-xs text-neutral-500">
            A public verification service — no account or approval needed.
          </p>
        </div>

        {certificate && certificate.status === "ACTIVE" ? (
          <>
            <div className="mt-6 text-center">
              {/* Animated checkmark draw */}
              <svg viewBox="0 0 56 56" className="mx-auto h-[76px] w-[76px]" role="img" aria-label="Verified">
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="animate-[draw-stroke_0.55s_ease-out_forwards] text-green-600 [stroke-dasharray:157] [stroke-dashoffset:157] dark:text-green-400"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 29.5 24.5 37 39 21"
                  className="animate-[draw-stroke_0.35s_0.5s_ease-out_forwards] text-green-600 [stroke-dasharray:60] [stroke-dashoffset:60] dark:text-green-400"
                />
              </svg>
              <p className="mt-3 text-base font-bold text-green-600 dark:text-green-400">
                Verified — genuine and active
              </p>
              <p className="mt-1 text-xs text-neutral-400">Checked {checkedAt}</p>
            </div>

            <Card className="mt-5 p-6">
              <div className="flex flex-wrap items-start gap-5">
                <dl className="flex min-w-[220px] flex-1 flex-col gap-2.5 text-left text-sm">
                  <Row label="Student name" value={certificate.student_name} />
                  <Row label="Institute" value={certificate.institute_name} />
                  <Row label="Course" value={certificate.course_name} />
                  {certificate.mode && <Row label="Mode" value={certificate.mode} />}
                  {certificate.grade && <Row label="Grade" value={certificate.grade} />}
                  <Row
                    label="Completion date"
                    value={
                      certificate.completion_date
                        ? new Date(certificate.completion_date).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"
                    }
                  />
                  <Row label="Certificate code" value={certificate.code} mono />
                </dl>
                <div className="mx-auto text-center">
                  <QrSvg text={`${BRAND.domain}/v/${encodeURIComponent(code)}`} />
                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    Scan to open
                    <br />
                    this page
                  </p>
                </div>
              </div>
            </Card>

            <VerifyActions
              code={code}
              studentName={certificate.student_name}
              courseName={certificate.course_name}
              instituteName={certificate.institute_name}
              issueDate={new Date(certificate.issued_at)}
            />

            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed dark:border-amber-900 dark:bg-amber-950">
              <span aria-hidden>⚠️</span>
              <span>
                <strong>Before you trust it:</strong> compare these details against the
                certificate presented to you. If any detail differs — name spelling, course,
                dates — treat the document as suspect and contact the institute directly.
              </span>
            </div>
          </>
        ) : certificate && certificate.status === "REVOKED" ? (
          <>
            <div className="mt-6 text-center">
              <p className="text-4xl" aria-hidden>
                ⚠️
              </p>
              <p className="mt-3 text-base font-bold text-amber-600 dark:text-amber-400">
                Revoked — no longer valid
              </p>
              <p className="mt-1 text-xs text-neutral-400">Checked {checkedAt}</p>
            </div>
            <Card className="mt-5 p-6">
              <dl className="flex flex-col gap-2.5 text-left text-sm">
                <Row label="Student name" value={certificate.student_name} />
                <Row label="Institute" value={certificate.institute_name} />
                <Row label="Course" value={certificate.course_name} />
                <Row label="Certificate code" value={certificate.code} mono />
              </dl>
              <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                This certificate was issued but has since been{" "}
                <strong>revoked by the institute</strong>, so it must not be treated as
                valid.
              </p>
            </Card>
            <VerifyActions code={code} studentName={certificate.student_name} compact />
          </>
        ) : (
          <>
            <Card className="mt-6 p-8 text-center">
              <p className="text-base font-semibold text-red-600 dark:text-red-400">
                Not verified
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                No active certificate matches code <span className="font-mono">{code}</span>.
                <br />
                Double-check the code for typos, or scan the QR printed on the certificate
                instead of typing it.
              </p>
            </Card>
            <VerifyActions code={code} studentName="" compact notFound />
          </>
        )}

        <p className="mt-6 text-center text-xs text-neutral-400">
          Verified by <strong>{BRAND.name}</strong>
        </p>
      </div>

      {/* Keyframes for the checkmark draw — scoped here to avoid touching globals.css */}
      <style>{`@keyframes draw-stroke { to { stroke-dashoffset: 0; } }`}</style>
    </main>
  );
}
