// src/server/certificates/generate-pdf.ts
//
// Renders a Certificate row as a downloadable PDF.
//
// TEMPLATE SYSTEM (2026-10-04): 10 designs, 1 free + 9 premium.
// This file is the dispatcher — it loads fonts, creates the document,
// and hands rendering to the institute's selected template in
// ./templates/. Each template is a fixed pattern; only the branding
// (logo, institute name, tagline, motto, contact, signatures, seal)
// changes per institute.
//
// Snapshot rule: only Certificate's own snapshot fields (studentNameSnapshot/
// instituteNameSnapshot/courseNameSnapshot/completionDate/grade/mode) plus
// `code` are read for the CERTIFIED FACTS — never a live join back to
// Student — so the PDF always matches what verification shows, even if the
// student's own record changes later.
//
// Branding is a deliberate exception: the institute's logo, tagline, motto,
// campus photo, established year, and Centre Head / Authority signature
// images are read LIVE from Tenant/Centre at generation time, not
// snapshotted onto Certificate. All optional.
//
// Anti-copy note: a printed certificate can always be photocopied — no
// visual design prevents that. What makes fakes detectable is the QR +
// online verification: the QR encodes the verify URL, and the
// verification page shows the official record.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import * as fontkit from "fontkit";
import { getTemplateRenderer } from "./templates";
import { DEFAULT_TEMPLATE_ID, isTemplateId } from "./templates/registry";
import type { CertFonts } from "./templates/types";
import { FONT_SERIF_B64, FONT_SCRIPT_B64, FONT_DEVA_B64 } from "./fonts-embedded";

export interface CertificateImage {
  bytes: Buffer;
  mimeType: string;
}

export interface CertificatePdfInput {
  code: string;
  studentName: string;
  instituteName: string;
  courseName: string;
  completionDate: Date | null;
  issuedAt: Date;
  verifyUrl: string;
  grade?: string | null;
  mode?: string | null;

  // Branding — all optional, see file header comment.
  logo?: CertificateImage | null;
  tagline?: string | null;
  motto?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  addressLine?: string | null;
  establishedYear?: number | null;
  campusPhoto?: CertificateImage | null;
  centreHeadName?: string | null;
  centreHeadSignature?: CertificateImage | null;
  authorityName?: string | null;
  authoritySignature?: CertificateImage | null;
}

export interface GeneratePdfOptions {
  /** Template id from the registry. Defaults to the free template. */
  templateId?: string;
  /**
   * When true, the template renders a full-page PREVIEW watermark.
   * Used for locked-template previews.
   */
  watermark?: boolean;
}

// ---------------------------------------------------------------- fonts
let fontBytesCache: { serif: Buffer; script: Buffer; deva: Buffer } | null = null;

function loadFontBytes(): { serif: Buffer; script: Buffer; deva: Buffer } {
  // Cache the raw bytes (safe to share); each PDFDocument must embed its
  // own PDFFont objects — a PDFFont embedded in doc A corrupts doc B.
  if (fontBytesCache) return fontBytesCache;
  const dir = join(process.cwd(), "public", "fonts");
  const read = (file: string): Buffer | null => {
    const p = join(dir, file);
    return existsSync(p) ? readFileSync(p) : null;
  };
  let serif = read("PlayfairDisplay-Bold.ttf");
  let script = read("GreatVibes.ttf");
  let deva = read("NotoSansDevanagari.ttf");
  if (!serif || !script || !deva) {
    // Fallback: embedded base64 fonts (repo may lack the binary TTFs).
    serif = serif ?? Buffer.from(FONT_SERIF_B64, "base64");
    script = script ?? Buffer.from(FONT_SCRIPT_B64, "base64");
    deva = deva ?? Buffer.from(FONT_DEVA_B64, "base64");
  }
  if (!serif || !script || !deva) throw new Error("certificate fonts missing from public/fonts");
  fontBytesCache = { serif, script, deva };
  return fontBytesCache;
}

async function loadFonts(doc: PDFDocument): Promise<CertFonts> {
  doc.registerFontkit(fontkit as unknown as Parameters<PDFDocument["registerFontkit"]>[0]);
  const bytes = loadFontBytes();
  const tryLoad = async (data: Buffer, fallback: PDFFont): Promise<PDFFont> => {
    try {
      return await doc.embedFont(data);
    } catch {
      return fallback;
    }
  };
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  return {
    serif: await tryLoad(bytes.serif, timesBold),
    script: await tryLoad(bytes.script, await doc.embedFont(StandardFonts.TimesRomanItalic)),
    deva: await tryLoad(bytes.deva, helvBold),
    helv,
    helvBold,
    helvOblique: await doc.embedFont(StandardFonts.HelveticaOblique),
    timesBold,
  };
}

// QA audit finding A6: pdf-lib's standard fonts only support WinAnsi
// (Windows-1252) encoding — any character outside that (Devanagari or
// another regional script in a name, for instance) throws deep inside
// generateCertificatePdf, at download time, with no useful message.
// Call this BEFORE creating any Student/Certificate row so the admin gets
// a clear, actionable validation error at registration time instead of a
// crash later.
export async function findUnsupportedCertificateText(
  fields: Record<string, string>,
): Promise<string[]> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const unsupported: string[] = [];
  for (const [label, value] of Object.entries(fields)) {
    if (!value) continue;
    try {
      font.widthOfTextAtSize(value, 10);
    } catch {
      unsupported.push(label);
    }
  }
  return unsupported;
}

// ---------------------------------------------------------------- main
export async function generateCertificatePdf(
  input: CertificatePdfInput,
  opts: GeneratePdfOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await loadFonts(doc);

  const W = 841.89;
  const H = 595.28;
  const page = doc.addPage([W, H]);

  const templateId = opts.templateId && isTemplateId(opts.templateId) ? opts.templateId : DEFAULT_TEMPLATE_ID;
  const render = getTemplateRenderer(templateId);
  await render({ doc, page, f, input, W, H, watermark: opts.watermark ?? false });

  return doc.save();
}
