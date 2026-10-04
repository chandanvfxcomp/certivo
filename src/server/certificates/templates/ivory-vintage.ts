// src/server/certificates/templates/ivory-vintage.ts
//
// Template — "Ivory Vintage" (PREMIUM, ₹499).
// Warm ivory/parchment background, bronze/brown accents, ornate double
// border with corner flourishes, vintage diploma feel: serif title with
// letterspaced small caps, decorative divider with diamond, bronze seal.
import { rgb, type PDFPage, type RGB } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  CREAM, centerText, fitSize, spaced, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

// ---------------------------------------------------------------- palette
const IVORY = rgb(0.961, 0.929, 0.847);
const TAN = rgb(0.9, 0.84, 0.7);
const BRONZE = rgb(0.45, 0.3, 0.15);
const BRONZE_DARK = rgb(0.33, 0.21, 0.1);
const BRONZE_LIGHT = rgb(0.62, 0.46, 0.25);
const SEPIA = rgb(0.25, 0.16, 0.08);
const INK = rgb(0.2, 0.13, 0.06);
const SEAL_FACE = rgb(0.87, 0.74, 0.52);

/** Ornate corner flourish: double L-lines with diamond tips + corner dot. */
function cornerFlourish(page: PDFPage, x: number, y: number, sx: number, sy: number, color: RGB) {
  const L = 24;
  // double L
  for (const [off, th] of [[0, 1.8], [5, 0.8]] as Array<[number, number]>) {
    page.drawLine({ start: { x: x + sx * (off + 6), y: y + sy * off }, end: { x: x + sx * L, y: y + sy * off }, thickness: th, color });
    page.drawLine({ start: { x: x + sx * off, y: y + sy * (off + 6) }, end: { x: x + sx * off, y: y + sy * L }, thickness: th, color });
  }
  // diamond tips
  const d = 3.5;
  for (const [dx, dy] of [[L + 5, 0], [0, L + 5]] as Array<[number, number]>) {
    poly(page, [
      { x: x + sx * dx, y: y + sy * dy + d },
      { x: x + sx * dx + d, y: y + sy * dy },
      { x: x + sx * dx, y: y + sy * dy - d },
      { x: x + sx * dx - d, y: y + sy * dy },
    ], { color });
  }
  page.drawCircle({ x, y, size: 2.6, color });
}

export async function renderIvoryVintage(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // ---- backdrop: warm ivory parchment ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  // soft parchment mottling
  page.drawCircle({ x: 150, y: 460, size: 130, color: TAN, opacity: 0.28 });
  page.drawCircle({ x: 700, y: 140, size: 150, color: TAN, opacity: 0.24 });
  page.drawCircle({ x: 430, y: 90, size: 95, color: TAN, opacity: 0.26 });
  page.drawCircle({ x: 120, y: 120, size: 90, color: TAN, opacity: 0.22 });
  page.drawCircle({ x: 740, y: 480, size: 110, color: TAN, opacity: 0.24 });
  // faint grain lines
  for (let i = 0; i < 6; i++) {
    page.drawLine({
      start: { x: 60, y: 120 + i * 78 }, end: { x: W - 60, y: 118 + i * 78 },
      thickness: 0.4, color: TAN, opacity: 0.35,
    });
  }

  // ---- ornate double border ----
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: BRONZE, borderWidth: 2.4 });
  page.drawRectangle({ x: 27, y: 27, width: W - 54, height: H - 54, borderColor: BRONZE_LIGHT, borderWidth: 0.9 });
  cornerFlourish(page, 18, 18, 1, 1, BRONZE);
  cornerFlourish(page, W - 18, 18, -1, 1, BRONZE);
  cornerFlourish(page, 18, H - 18, 1, -1, BRONZE);
  cornerFlourish(page, W - 18, H - 18, -1, -1, BRONZE);
  // mid-edge diamonds
  const edgeDiamond = (dx: number, dy: number) => {
    const d = 4.5;
    poly(page, [
      { x: dx, y: dy + d }, { x: dx + d, y: dy },
      { x: dx, y: dy - d }, { x: dx - d, y: dy },
    ], { color: BRONZE });
  };
  edgeDiamond(cx, 18); edgeDiamond(cx, H - 18);
  edgeDiamond(18, H / 2); edgeDiamond(W - 18, H / 2);

  // ---- header: logo (or bronze monogram badge) + institute ----
  const logo = await tryEmbedImage(doc, input.logo);
  let y = H - 80;
  if (logo) {
    const s = 56;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, {
      x: cx - (logo.width * sc) / 2, y: y - 6,
      width: logo.width * sc, height: logo.height * sc,
    });
    y -= 60;
  } else {
    const mono = monogramOf(input.instituteName);
    page.drawCircle({ x: cx, y: y - 24, size: 27, borderColor: BRONZE, borderWidth: 2 });
    page.drawCircle({ x: cx, y: y - 24, size: 22.5, borderColor: BRONZE_LIGHT, borderWidth: 0.8 });
    const ms = fitSize(f.serif, mono, 34, 20);
    centerText(page, mono, cx, y - 24 - ms * 0.34, f.serif, ms, BRONZE_DARK);
    y -= 58;
  }
  const nameSize = fitSize(f.serif, input.instituteName.toUpperCase(), W - 240, 26);
  centerText(page, input.instituteName.toUpperCase(), cx, y, f.serif, nameSize, BRONZE_DARK);
  y -= 22;
  if (input.tagline) {
    centerText(page, input.tagline, cx, y, f.helvOblique, fitSize(f.helvOblique, input.tagline, 400, 11.5), BRONZE);
    y -= 20;
  }
  // decorative divider with diamond
  page.drawLine({ start: { x: cx - 190, y }, end: { x: cx - 13, y }, thickness: 1.2, color: BRONZE });
  page.drawLine({ start: { x: cx + 13, y }, end: { x: cx + 190, y }, thickness: 1.2, color: BRONZE });
  poly(page, [
    { x: cx, y: y + 5 }, { x: cx + 5, y },
    { x: cx, y: y - 5 }, { x: cx - 5, y },
  ], { color: BRONZE_DARK });
  page.drawCircle({ x: cx - 200, y, size: 2, color: BRONZE });
  page.drawCircle({ x: cx + 200, y, size: 2, color: BRONZE });
  y -= 32;

  // ---- title: vintage diploma small caps ----
  centerText(page, spaced("CERTIFICATE"), cx, y, f.serif, 40, BRONZE_DARK);
  y -= 30;
  centerText(page, spaced("OF COMPLETION"), cx, y, f.helvBold, 12, BRONZE);
  y -= 20;
  if (input.motto) {
    centerText(page, input.motto, cx, y, f.deva, fitSize(f.deva, input.motto, 420, 11.5), BRONZE_LIGHT);
    y -= 20;
  }
  centerText(page, spaced("THIS IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, BRONZE_LIGHT);
  y -= 42;

  // ---- student ----
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 470, 44), SEPIA);
  y -= 30;
  page.drawLine({ start: { x: cx - 150, y }, end: { x: cx + 150, y }, thickness: 0.9, color: BRONZE_LIGHT });
  y -= 26;
  centerText(page, "has successfully completed", cx, y, f.helvOblique, 11, BRONZE);
  y -= 24;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 500, 18.5), SEPIA);
  y -= 36;

  // ---- info strip ----
  const cells: Array<[string, string]> = [
    ["CERTIFICATE ID", input.code],
    ["DATE OF ISSUE", formatCertDate(input.issuedAt)],
    ["MODE", input.mode || "—"],
    ["GRADE", input.grade || "—"],
  ];
  const colW = 130;
  const x0 = cx - (colW * cells.length) / 2;
  cells.forEach(([label, value], i) => {
    const ccx = x0 + colW * i + colW / 2;
    centerText(page, label, ccx, y + 14, f.helv, 7, BRONZE);
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), INK);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 1, color: BRONZE_LIGHT });
    }
  });
  y -= 58;

  // ---- bronze seal ----
  drawSeal(page, f, cx, y - 10, 30, input.instituteName, input.establishedYear ?? null, {
    ring: BRONZE,
    band: BRONZE_DARK,
    face: SEAL_FACE,
    text: CREAM,
  });

  // ---- signatures ----
  const sig = async (
    sx: number,
    name: string | null | undefined,
    title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = y - 52;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, { x: sx - sw / 2, y: lineY + 6, width: sw, height: Math.min((emb.height / emb.width) * sw, 40) });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), SEPIA);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: BRONZE });
    if (name) centerText(page, name, sx, lineY - 16, f.helvBold, 9.5, INK);
    centerText(page, title, sx, lineY - 29, f.helv, 8, BRONZE);
  };
  await sig(cx - 190, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 190, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR ----
  const qs = 62;
  page.drawRectangle({ x: W - 108, y: 44, width: qs + 10, height: qs + 10, color: rgb(1, 1, 1), borderColor: BRONZE, borderWidth: 1.2 });
  drawQrCode(page, input.verifyUrl, { x: W - 103, y: 49, size: qs, color: SEPIA });
  centerText(page, "SCAN TO VERIFY", W - 66, 34, f.helvBold, 7, BRONZE_DARK);

  // verify url footer
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 34, f.helv, 7.5, BRONZE);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
