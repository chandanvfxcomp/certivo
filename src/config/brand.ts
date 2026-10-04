// src/config/brand.ts — the ONLY file to change when the name is decided.
//
// PLATFORM-CORE-SPECIFICATION.md Section 1.1 / CLAUDE.md Hard Rule #2:
// the brand name is not final. Every UI string, email template, page
// title, and meta tag must read from this config — never hardcode a
// brand string anywhere else (not in a component, not in an email, not
// in a seed file, not in a page title).
//
// Hard rule (spec 1.1): no production credential may be issued until
// BRAND.domain is final, because the domain is permanently embedded in
// QR codes. Not relevant to P0 — no credentials exist yet — but keep the
// constraint in mind before this file's `domain` value is ever treated
// as real.
// QA audit finding G4: PLATFORM-CORE-SPECIFICATION.md's own working title
// ("Certivo") and package.json's description ("Brand name TBD") disagreed
// with this file — two sources of truth for the same decision. Resolving
// the name here (not the domain — BRAND.domain stays a placeholder, see
// isBrandDomainConfigured() below, until a real domain is owned).
export const BRAND = {
  /** Display name shown in UI, emails, and page titles. */
  name: "Certivo",
  /** Full legal entity name, for ToS / invoices / footers. */
  legalName: "Certivo Technologies",
  /** Canonical domain, no protocol. Embedded in QR codes once real — see above. */
  domain: "example.com",
  /** Support / contact address used in transactional email and footers. */
  supportEmail: "support@example.com",
  /** Marketing tagline. */
  tagline: "Issue. Verify. Trust.",
} as const;

export type Brand = typeof BRAND;

// QA audit finding A1: BRAND.domain is permanently embedded in every
// certificate's verification URL once issued (see
// src/server/certificates/generate-pdf.ts / the certificate download
// route), so issuing certificates before it's a real, owned domain means
// every one of them is wrong forever. Call this before any certificate
// gets created, not just at render time.
export function isBrandDomainConfigured(): boolean {
  return BRAND.domain !== "example.com";
}
