// src/lib/linkedin.ts
//
// LinkedIn "Add to profile" — the official deep-link format for adding a
// certification to a LinkedIn profile in one click. Used on the public
// verify page and the student portal.
import { BRAND } from "@/config/brand";

export interface LinkedInCertParams {
  courseName: string;
  instituteName: string;
  certificateCode: string;
  issueDate: Date;
  expiryDate?: Date | null;
}

/** Builds the linkedin.com/profile/add URL for a certificate. */
export function linkedInAddToProfileUrl(params: LinkedInCertParams): string {
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: params.courseName,
    organizationName: params.instituteName,
    issueYear: String(params.issueDate.getFullYear()),
    issueMonth: String(params.issueDate.getMonth() + 1),
    certId: params.certificateCode,
    certUrl: `https://${BRAND.domain}/v/${encodeURIComponent(params.certificateCode)}`,
  });
  if (params.expiryDate) {
    q.set("expirationYear", String(params.expiryDate.getFullYear()));
    q.set("expirationMonth", String(params.expiryDate.getMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}
