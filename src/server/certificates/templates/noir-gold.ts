// src/server/certificates/templates/noir-gold.ts
//
// Template 7/10 — "Noir Gold" (PREMIUM, Rs 799).
// Bold black & gold luxury statement: full-bleed near-black page,
// double gold hairline border, gold serif title, gold script student
// name, generous whitespace, thin gold dividers.
import { rgb } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  poly, goldRule, centerText, fitSize, spaced,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

const NOIR = rgb(0.043, 0.043, 0.047); // #0B0B0C
const NOIR_SOFT = rgb(0.1, 0.1, 0.105);
const GOLD_X = rgb(0.85, 0.68, 0.2); // bright gold
const GOLD_MID = rgb(0.7, 0.55, 0.16);
const GOLD_DIM = rgb(0.52, 0.4, 0.14);
const IVORY = rgb(0.96, 0.94, 0.88);

export async function renderNoirGold(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // ---- full-bleed black + double gold hairline border ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NOIR });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: GOLD_X, borderWidth: 1.2 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: GOLD_DIM, borderWidth: 0.6 });
  // corner diamonds
  const corners: Array<[number, number]> = [[24, 24], [W - 24, 24], [24, H - 24], [W - 24, H - 24]];
  for (const [dx, dy] of corners) {
    const d = 5;
    poly(
      page,
      [
        { x: dx, y: dy + d }, { x: dx + d, y: dy },
        { x: dx, y: dy - d }, { x: dx - d, y: dy },
      ],
      { color: GOLD_X },
    );
  }

  // ---- header: logo / gold monogram + institute ----
  let y = H - 58;
  const logo = await tryEmbedImage(doc, input.logo);
  if (logo) {
    const s = 50;
    const sc = Math.min(s / logo.width, s / logo.height);
    const w = logo.width * sc;
    page.drawImage(logo, { x: cx - w / 2, y: y - s, width: w, height: logo.height * sc });
    y -= s + 14;
  } else {
    page.drawCircle({ x: cx, y: y - 30, size: 30, borderColor: GOLD_X, borderWidth: 1.4 });
    page.drawCircle({ x: cx, y: y - 30, size: 26, borderColor: GOLD_DIM, borderWidth: 0.6 });
    const mono = monogramOf(input.instituteName);
    const ms = fitSize(f.serif, mono, 40, 24);
    centerText(page, mono, cx, y - 30 - ms * 0.34, f.serif, ms, GOLD_X);
    y -= 74;
  }
  const nSize = fitSize(f.serif, input.instituteName.toUpperCase(), W - 260, 25);
  centerText(page, input.instituteName.toUpperCase(), cx, y, f.serif, nSize, GOLD_X);
  y -= 28;
  if (input.tagline) {
    const t = spaced(input.tagline.toUpperCase());
    centerText(page, t, cx, y, f.helv, fitSize(f.helv, t, 460, 9.5), GOLD_DIM);
    y -= 24;
  }
  goldRule(page, cx, y, 150, GOLD_X);
  y -= 34;

  // ---- title ----
  centerText(page, "CERTIFICATE", cx, y, f.serif, 40, GOLD_X);
  y -= 32;
  centerText(page, spaced("OF COMPLETION"), cx, y, f.helvBold, 12, GOLD_MID);
  y -= 28;
  centerText(page, spaced("PROUDLY PRESENTED TO"), cx, y, f.helv, 8, IVORY);
  y -= 42;

  // ---- student name (gold script) ----
  const sSize = fitSize(f.script, input.studentName, 560, 44);
  centerText(page, input.studentName, cx, y, f.script, sSize, GOLD_X);
  y -= 26;
  page.drawLine({ start: { x: cx - 130, y }, end: { x: cx - 14, y }, thickness: 1, color: GOLD_MID });
  page.drawLine({ start: { x: cx + 14, y }, end: { x: cx + 130, y }, thickness: 1, color: GOLD_MID });
  poly(
    page,
    [
      { x: cx, y: y + 5 }, { x: cx + 5, y },
      { x: cx, y: y - 5 }, { x: cx - 5, y },
    ],
    { color: GOLD_X },
  );
  y -= 28;
  centerText(page, "has successfully completed", cx, y, f.helvOblique, 11, IVORY);
  y -= 24;
  const cSize = fitSize(f.serif, input.courseName, 540, 18);
  centerText(page, input.courseName, cx, y, f.serif, cSize, GOLD_X);
  y -= 38;

  // ---- info strip ----
  const cells: Array<[string, string]> = [
    ["CERTIFICATE ID", input.code],
    ["DATE OF ISSUE", formatCertDate(input.issuedAt)],
    ["MODE", input.mode || "-"],
    ["GRADE", input.grade || "-"],
  ];
  const colW = 140;
  const x0 = cx - (colW * cells.length) / 2;
  cells.forEach(([label, value], i) => {
    const ccx = x0 + colW * i + colW / 2;
    centerText(page, label, ccx, y, f.helv, 7, GOLD_DIM);
    centerText(page, value, ccx, y - 16, f.helvBold, fitSize(f.helvBold, value, colW - 12, 10.5), IVORY);
    if (i > 0) {
      page.drawLine({
        start: { x: x0 + colW * i, y: y + 8 }, end: { x: x0 + colW * i, y: y - 24 },
        thickness: 0.8, color: GOLD_DIM,
      });
    }
  });
  y -= 54;

  // ---- seal + signatures ----
  drawSeal(page, f, cx, y - 6, 28, input.instituteName, input.establishedYear ?? null, {
    ring: GOLD_X,
    band: NOIR_SOFT,
    face: GOLD_X,
    text: rgb(0.918, 0.776, 0.31),
  });

  const sig = async (
    sx: number,
    name: string | null | undefined,
    title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = y - 40;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, {
        x: sx - sw / 2, y: lineY + 6, width: sw,
        height: Math.min((emb.height / emb.width) * sw, 38),
      });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 20), GOLD_X);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 0.9, color: GOLD_MID });
    if (name) centerText(page, name, sx, lineY - 15, f.helvBold, 9, IVORY);
    centerText(page, title, sx, lineY - 28, f.helv, 8, GOLD_DIM);
  };
  await sig(cx - 200, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 200, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR (bottom-right, gold on black) ----
  const qs = 54;
  page.drawRectangle({
    x: W - 118, y: 58, width: qs + 12, height: qs + 12,
    borderColor: GOLD_DIM, borderWidth: 0.8,
  });
  drawQrCode(page, input.verifyUrl, { x: W - 112, y: 64, size: qs, color: GOLD_X });
  centerText(page, "SCAN TO VERIFY", W - 79, 48, f.helvBold, 6.5, GOLD_DIM);

  // ---- footer ----
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 40, f.helv, 7.5, GOLD_DIM);
  if (input.establishedYear) {
    page.drawText(`ESTD. ${input.establishedYear}`, { x: 48, y: 40, size: 7.5, font: f.helv, color: GOLD_DIM });
  }

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
