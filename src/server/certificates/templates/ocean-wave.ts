// src/server/certificates/templates/ocean-wave.ts
//
// Template 9/10 — "Ocean Wave" (PREMIUM, ₹499).
// Flowing blue waves with a fresh modern feel: a deep-navy header with
// layered sine-wave bands in ocean tones, crisp white body with blue
// accents, and a blue-and-white seal.
import { rgb, type RGB, type PDFPage } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  WHITE, GRAY, GRAY_DARK,
  centerText, fitSize, spaced, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

// ---------------------------------------------------------------- palette
const DEEP = rgb(0.043, 0.13, 0.33); // deep ocean navy
const OCEAN = rgb(0.12, 0.42, 0.75); // primary ocean blue
const SKY = rgb(0.42, 0.68, 0.92); // light wave blue
const PALE = rgb(0.86, 0.93, 1.0); // pale blue tint
const INK = rgb(0.1, 0.2, 0.38); // body text navy
const SLATE = rgb(0.36, 0.5, 0.68); // muted blue-grey

/**
 * Smooth wave band: a sine curve from x0 to x1, closed along yClose.
 * Curves are approximated with many small segments so poly() renders
 * them smoothly.
 */
function waveBand(
  x0: number,
  x1: number,
  yBase: number,
  amp: number,
  cycles: number,
  phase: number,
  yClose: number,
  steps = 140,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    pts.push({ x, y: yBase + amp * Math.sin((i / steps) * Math.PI * 2 * cycles + phase) });
  }
  pts.push({ x: x1, y: yClose }, { x: x0, y: yClose });
  return pts;
}

/** Thin blue divider line with a centre diamond. */
function waveRule(page: PDFPage, cx: number, y: number, halfWidth: number, color: RGB) {
  page.drawLine({ start: { x: cx - halfWidth, y }, end: { x: cx - 12, y }, thickness: 1.2, color });
  page.drawLine({ start: { x: cx + 12, y }, end: { x: cx + halfWidth, y }, thickness: 1.2, color });
  const d = 5;
  poly(
    page,
    [
      { x: cx, y: y + d },
      { x: cx + d, y },
      { x: cx, y: y - d },
      { x: cx - d, y },
    ],
    { color },
  );
}

export async function renderOceanWave(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // backdrop
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // ---- layered wave header ----
  // Solid deep-navy base guarantees blue behind the header text; two
  // lighter wave bands flow over its lower edge.
  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: DEEP });
  poly(page, waveBand(0, W, H - 128, 20, 1, 1.25, H), { color: OCEAN });
  poly(page, waveBand(0, W, H - 96, 14, 1, 2.6, H), { color: SKY });

  // ---- header: logo + institute (white on the waves) ----
  const logo = await tryEmbedImage(doc, input.logo);
  if (logo) {
    const s = 50;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, {
      x: cx - (logo.width * sc) / 2,
      y: H - 66,
      width: logo.width * sc,
      height: logo.height * sc,
    });
  } else {
    page.drawCircle({ x: cx, y: H - 52, size: 24, color: WHITE });
    page.drawCircle({ x: cx, y: H - 52, size: 24, borderColor: DEEP, borderWidth: 2 });
    const mono = monogramOf(input.instituteName);
    centerText(page, mono, cx, H - 52 - 8, f.serif, fitSize(f.serif, mono, 32, 19), DEEP);
  }
  centerText(
    page,
    input.instituteName.toUpperCase(),
    cx,
    H - 108,
    f.serif,
    fitSize(f.serif, input.instituteName.toUpperCase(), W - 240, 21),
    WHITE,
  );
  if (input.tagline) {
    centerText(page, input.tagline, cx, H - 126, f.helvOblique, fitSize(f.helvOblique, input.tagline, 400, 10.5), PALE);
  }

  // ---- body ----
  let y = H - 172;
  const title = spaced("CERTIFICATE");
  centerText(page, title, cx, y, f.serif, fitSize(f.serif, title, W - 260, 36), INK);
  y -= 30;
  centerText(page, spaced("OF COMPLETION"), cx, y, f.helvBold, 11, OCEAN);
  y -= 26;
  centerText(page, spaced("THIS IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, GRAY);
  y -= 42;
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 460, 42), INK);
  y -= 30;
  waveRule(page, cx, y, 150, SKY);
  y -= 26;
  centerText(page, "has successfully completed", cx, y, f.helvOblique, 11, GRAY);
  y -= 24;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 480, 18), INK);
  y -= 34;

  // ---- info strip ----
  const cells: Array<[string, string]> = [
    ["CERTIFICATE ID", input.code],
    ["DATE OF ISSUE", formatCertDate(input.issuedAt)],
    ["MODE", input.mode || "-"],
    ["GRADE", input.grade || "-"],
  ];
  const colW = 130;
  const x0 = cx - (colW * cells.length) / 2;
  cells.forEach(([label, value], i) => {
    const ccx = x0 + colW * i + colW / 2;
    centerText(page, label, ccx, y + 14, f.helv, 7, SLATE);
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), INK);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 1, color: SKY });
    }
  });
  y -= 52;

  // ---- seal + signatures ----
  drawSeal(page, f, cx, y - 8, 29, input.instituteName, input.establishedYear ?? null, {
    ring: DEEP,
    band: DEEP,
    face: OCEAN,
    text: WHITE,
  });

  const sig = async (
    sx: number,
    name: string | null | undefined,
    title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = y - 46;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, { x: sx - sw / 2, y: lineY + 6, width: sw, height: Math.min((emb.height / emb.width) * sw, 40) });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), INK);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: OCEAN });
    if (name) centerText(page, name, sx, lineY - 15, f.helvBold, 9.5, GRAY_DARK);
    centerText(page, title, sx, lineY - 27, f.helv, 8, GRAY);
  };
  await sig(cx - 200, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 200, input.authorityName, "Authority", input.authoritySignature);

  // ---- layered wave footer ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: 80, color: DEEP });
  poly(page, waveBand(0, W, 62, 11, 1, 2.1, 0), { color: OCEAN });
  poly(page, waveBand(0, W, 46, 8, 1, 3.4, 0), { color: SKY });
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 32, f.helv, 7.5, WHITE);

  // ---- QR ----
  const qs = 62;
  page.drawRectangle({ x: W - 112, y: 140, width: qs + 10, height: qs + 10, color: WHITE, borderColor: OCEAN, borderWidth: 1 });
  drawQrCode(page, input.verifyUrl, { x: W - 107, y: 145, size: qs, color: INK });
  centerText(page, "SCAN TO VERIFY", W - 71, 130, f.helvBold, 7, OCEAN);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
