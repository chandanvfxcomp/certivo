// src/server/certificates/branding.ts
//
// Builds CertificatePdfInput branding fields LIVE from Tenant/Centre.
// Used by both real downloads and watermarked template previews.
import { prisma } from "@/server/db/client";
import { withTenant } from "@/server/db/tenant-client";
import { getFileBytes } from "@/server/storage/local-disk";
import { BRAND } from "@/config/brand";
import type { CertificateImage, CertificatePdfInput } from "./generate-pdf";

async function loadImage(
  tenantId: string,
  fileId: string | null | undefined,
): Promise<CertificateImage | null> {
  if (!fileId) return null;
  const file = await withTenant(tenantId, (tx) => getFileBytes(tx, fileId, tenantId));
  return file ? { bytes: file.bytes, mimeType: file.mimeType } : null;
}

export interface BrandingFacts {
  code: string;
  studentName: string;
  instituteName: string;
  courseName: string;
  completionDate: Date | null;
  issuedAt: Date;
  grade: string | null;
  mode: string | null;
}

/** Sample facts for watermarked template previews. */
export function sampleBrandingFacts(instituteName: string): BrandingFacts {
  return {
    code: "CERTIVO-SAMPLE-0001",
    studentName: "Aarav Sharma",
    instituteName,
    courseName: "Advanced Computer Applications",
    completionDate: new Date(),
    issuedAt: new Date(),
    grade: "A+",
    mode: "Offline",
  };
}

export async function buildCertificatePdfInput(
  tenantId: string,
  facts: BrandingFacts,
): Promise<CertificatePdfInput> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const centre = await withTenant(tenantId, (tx) =>
    tx.centre.findFirst({ where: { tenantId, isPrimary: true } }),
  );

  const [logo, campusPhoto, centreHeadSignature, authoritySignature] = await Promise.all([
    loadImage(tenantId, tenant.logoFileId),
    loadImage(tenantId, tenant.campusPhotoFileId),
    loadImage(tenantId, centre?.headSignatureFileId),
    loadImage(tenantId, tenant.authoritySignatureFileId),
  ]);

  return {
    code: facts.code,
    studentName: facts.studentName,
    instituteName: facts.instituteName,
    courseName: facts.courseName,
    completionDate: facts.completionDate,
    issuedAt: facts.issuedAt,
    verifyUrl: `https://${BRAND.domain}/v/${facts.code}`,
    grade: facts.grade,
    mode: facts.mode,
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
  };
}
