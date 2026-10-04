// src/server/certificates/templates/types.ts
//
// Template system: 10 certificate designs, 1 free + 9 premium.
// Every template receives the same TemplateContext and renders onto
// the provided page. Templates must ONLY use ctx.input branding —
// never reach for the database.
import type { PDFDocument, PDFFont, PDFPage, RGB } from "pdf-lib";
import type { CertificatePdfInput } from "../generate-pdf";

export interface CertFonts {
  serif: PDFFont; // Playfair Display Bold — headings
  script: PDFFont; // Great Vibes — names, script accents
  deva: PDFFont; // Noto Sans Devanagari — Hindi tagline
  helv: PDFFont;
  helvBold: PDFFont;
  helvOblique: PDFFont;
  timesBold: PDFFont;
}

export interface TemplateContext {
  doc: PDFDocument;
  page: PDFPage;
  f: CertFonts;
  input: CertificatePdfInput;
  /** Page width (841.89 for A4 landscape). */
  W: number;
  /** Page height (595.28 for A4 landscape). */
  H: number;
  /**
   * When true, the template must render a full-page watermark
   * (diagonal "PREVIEW" + "CERTIVO" text). Used for locked-template
   * previews so institutes can see the design but not use it.
   */
  watermark: boolean;
}

export type TemplateTier = "free" | "premium";

export interface TemplateMeta {
  /** Stable id, e.g. "classic-simple". Stored on Tenant.activeTemplateId. */
  id: string;
  name: string;
  /** One-line marketing blurb for the gallery. */
  blurb: string;
  tier: TemplateTier;
  /** One-time unlock price in paise. 0 for the free template. */
  pricePaise: number;
  /** Accent colour name shown in the gallery (informational). */
  accent: string;
}

export type TemplateRenderer = (ctx: TemplateContext) => Promise<void>;

/** Monogram: first letters of the first two words, e.g. "MJ". */
export function monogramOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (((words[0] ?? "C")[0] ?? "C") + ((words[1] ?? "")[0] ?? "")).toUpperCase();
}

/** "6 September 2026" style date. */
export function formatCertDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export type { RGB };
