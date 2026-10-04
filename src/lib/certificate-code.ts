// src/lib/certificate-code.ts
//
// The frozen credential-code contract (spec Section 4):
// <TENANT_PREFIX>-<YEAR>-<RANDOM10>. Immutable once issued — never
// regenerate a code for an existing certificate, even on correction (issue
// a fresh certificate + revoke the old one instead).
import { randomBase32 } from "@/lib/ulid";

export function generateCertificateCode(tenantPrefix: string, issuedAt: Date = new Date()): string {
  const year = issuedAt.getUTCFullYear();
  const random10 = randomBase32(10);
  return `${tenantPrefix}-${year}-${random10}`;
}
