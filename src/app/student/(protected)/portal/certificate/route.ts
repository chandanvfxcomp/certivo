// src/app/student/(protected)/portal/certificate/route.ts
//
// Serves the signed-in student their OWN active certificate as a PDF.
// Ownership is enforced by scoping the query to session.studentId — never
// trust a certificate id passed by the client for this endpoint, there
// isn't one; the session alone determines whose certificate comes back.
import { NextResponse } from "next/server";
import { requireStudentSession } from "@/server/auth/session";
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";
import { generateCertificatePdf, type CertificateImage } from "@/server/certificates/generate-pdf";
import { resolveDownloadTemplateId } from "@/server/certificates/template-service";
import { getFileBytes } from "@/server/storage/local-disk";
import { BRAND } from "@/config/brand";
import { FREE_DOWNLOADS_PER_PAYMENT, PLATFORM_REDOWNLOAD_FEE_PAISE } from "@/config/certificate";
import { sendEmail } from "@/server/email/client";
import { downloadConfirmationEmail } from "@/server/email/templates";

export async function GET(): Promise<NextResponse> {
  let session;
  try {
    session = await requireStudentSession();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const certificate = await withTenant(session.tenantId, (tx) =>
    tx.certificate.findFirst({
      where: { studentId: session.studentId, tenantId: session.tenantId, status: "ACTIVE" },
      orderBy: { issuedAt: "desc" },
      include: { student: { select: { centreId: true, email: true, fullName: true } } },
    }),
  );

  if (!certificate) {
    return NextResponse.json({ error: "NO_CERTIFICATE" }, { status: 404 });
  }

  // Download gating — per the user's explicit instruction (2026-10-04):
  // every certificate gets FREE_DOWNLOADS_PER_PAYMENT free downloads.
  // After those are used up, EACH further download costs the fixed ₹299
  // platform fee (PLATFORM_REDOWNLOAD_FEE_PAISE) — one payment unlocks
  // exactly one download. platformFeePaid is a single-use token: the
  // payment sets it true, and a paid download consumes it (sets it false)
  // in the same atomic UPDATE below. Verification stays free forever.
  //
  // QA audit finding B1: the check-and-increment is folded into the WHERE
  // clause of a single atomic UPDATE: Postgres only lets ONE concurrent
  // request's WHERE match before the other's increment lands, so
  // `updated.count === 0` reliably means "this request lost the race or
  // was already over the limit".
  const updated = await withTenant(session.tenantId, (tx) =>
    tx.certificate.updateMany({
      where: {
        id: certificate.id,
        tenantId: session.tenantId,
        OR: [
          // Free downloads remaining.
          { downloadCount: { lt: FREE_DOWNLOADS_PER_PAYMENT } },
          // Paid download: single-use token from payPlatformFee.
          {
            downloadCount: { gte: FREE_DOWNLOADS_PER_PAYMENT },
            platformFeePaid: true,
          },
        ],
      },
      data: {
        downloadCount: { increment: 1 },
        // Consume the single-use token if this was a paid download.
        // (For free downloads platformFeePaid is already false, so this
        // is a no-op there.)
        platformFeePaid: false,
      },
    }),
  );

  if (updated.count === 0) {
    // Free downloads exhausted and no paid token (or a concurrent request
    // just consumed the token) — each further download costs ₹299.
    return NextResponse.json(
      { error: "PLATFORM_FEE_PENDING", feePaise: PLATFORM_REDOWNLOAD_FEE_PAISE },
      { status: 402 },
    );
  }

  // Branding is read LIVE from Tenant/Centre, never snapshotted — see
  // generate-pdf.ts's header comment for why. `tenant` is a
  // platform-level table (no RLS policy, per Section 6.3's carve-out), so
  // it's read directly through the base client the same way
  // admin/actions.ts's registerStudent does; `centre` is tenant-scoped
  // and goes through withTenant like everything else on that table.
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId } });
  const centre = await withTenant(session.tenantId, (tx) =>
    tx.centre.findFirst({ where: { id: certificate.student.centreId, tenantId: session.tenantId } }),
  );

  // Loads a branding image (logo / a signature) by FileObject id, scoped
  // to this tenant — same tenant-ownership check as every other file
  // read in this codebase. Missing file / never uploaded / unreadable on
  // disk all collapse to `null` here, and generate-pdf.ts already treats
  // every image field as optional, so a certificate for an institute
  // that hasn't uploaded branding yet still renders correctly.
  const loadImage = async (fileId: string | null | undefined): Promise<CertificateImage | null> => {
    if (!fileId) return null;
    const file = await withTenant(session.tenantId, (tx) => getFileBytes(tx, fileId, session.tenantId));
    return file ? { bytes: file.bytes, mimeType: file.mimeType } : null;
  };

  const [logo, campusPhoto, centreHeadSignature, authoritySignature] = await Promise.all([
    loadImage(tenant.logoFileId),
    loadImage(tenant.campusPhotoFileId),
    loadImage(centre?.headSignatureFileId),
    loadImage(tenant.authoritySignatureFileId),
  ]);

  const templateId = await resolveDownloadTemplateId(session.tenantId);
  const pdfBytes = await generateCertificatePdf(
    {
    code: certificate.code,
    studentName: certificate.studentNameSnapshot,
    instituteName: certificate.instituteNameSnapshot,
    courseName: certificate.courseNameSnapshot,
    completionDate: certificate.completionDate,
    issuedAt: certificate.issuedAt,
    verifyUrl: `https://${BRAND.domain}/v/${certificate.code}`,
    grade: certificate.grade,
    mode: certificate.mode,
    logo,
    tagline: tenant.tagline,
    motto: tenant.motto,
    website: tenant.website,
    contactEmail: tenant.ownerEmail,
    addressLine: [tenant.addressLine1, tenant.city, tenant.state, tenant.pincode].filter(Boolean).join(", ") || null,
    establishedYear: tenant.establishedYear,
    campusPhoto,
    centreHeadName: centre?.headName ?? null,
    centreHeadSignature,
    authorityName: tenant.authorizedPerson ?? tenant.ownerName,
    authoritySignature,
  },
    { templateId },
  );

  // Download confirmation email — the user's explicit "confirmation mail
  // for download". Sent after the PDF is successfully generated; a failure
  // here must never break the download itself (sendEmail never throws).
  // Re-read downloadCount so the email states the correct remaining count.
  if (certificate.student.email) {
    const fresh = await withTenant(session.tenantId, (tx) =>
      tx.certificate.findFirstOrThrow({
        where: { id: certificate.id, tenantId: session.tenantId },
        select: { downloadCount: true },
      }),
    );
    const template = downloadConfirmationEmail({
      studentName: certificate.student.fullName,
      courseName: certificate.courseNameSnapshot,
      certificateCode: certificate.code,
      downloadsLeft: Math.max(0, FREE_DOWNLOADS_PER_PAYMENT - fresh.downloadCount),
    });
    await sendEmail({ to: certificate.student.email, ...template });
  }

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificate.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
