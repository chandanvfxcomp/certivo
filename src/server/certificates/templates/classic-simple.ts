// src/server/certificates/templates/classic-simple.ts
//
// Template 1/10 — "Classic Simple" (FREE).
// Clean, timeless, minimal: white page, thin double navy border,
// centred serif layout, gold accents. The free tier template.
import type { TemplateContext } from "./types";
import { formatCertDate } from "./types";
import {
  NAVY, GOLD, GOLD_DARK, GRAY, GRAY_DARK, WHITE,
  centerText, fitSize, spaced, goldRule, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

export async function renderClassicSimple(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // backdrop
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // double navy border with gold hairline
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: NAVY, borderWidth: 2.5 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: GOLD, borderWidth: 0.8 });
  // corner diamonds
  const corners: Array<[number, number]> = [[18, 18], [W - 18, 18], [18, H - 18], [W - 18, H - 18]];
  for (const [dx, dy] of corners) {
    const d = 5;
    poly(page, [
      { x: dx, y: dy + d }, { x: dx + d, y: dy },
      { x: dx, y: dy - d }, { x: dx - d, y: dy },
    ], { color: GOLD });
  }

  // ---- header: logo + institute ----
  const logo = await tryEmbedImage(doc, input.logo);
  let y = H - 78;
  if (logo) {
    const s = 58;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, { x: cx - (logo.width * sc) / 2, y: y - 10, width: logo.width * sc, height: logo.height * sc });
    y -= 62;
  }
  const nameSize = fitSize(f.serif, input.instituteName.toUpperCase(), W - 220, 28);
  centerText(page, input.instituteName.toUpperCase(), cx, y, f.serif, nameSize, NAVY);
  y -= 24;
  if (input.tagline) {
    centerText(page, input.tagline, cx, y, f.helvOblique, fitSize(f.helvOblique, input.tagline, 380, 12), GOLD_DARK);
    y -= 20;
  }
  goldRule(page, cx, y, 170);
  y -= 34;

  // ---- title ----
  centerText(page, "CERTIFICATE", cx, y, f.serif, 46, NAVY);
  y -= 30;
  const sub = spaced("OF ACHIEVEMENT");
  centerText(page, sub, cx, y, f.helvBold, 13, GOLD_DARK);
  y -= 26;
  centerText(page, spaced("THIS IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, GRAY);
  y -= 44;

  // ---- student ----
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 460, 44), NAVY);
  y -= 30;
  goldRule(page, cx, y, 150);
  y -= 26;
  centerText(page, "has successfully completed", cx, y, f.helvOblique, 11, GRAY);
  y -= 24;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 480, 18), NAVY);
  y -= 34;

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
    centerText(page, label, ccx, y + 14, f.helv, 7, GRAY);
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), NAVY);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 1, color: GOLD });
    }
  });
  y -= 58;

  // ---- seal + signatures ----
  drawSeal(page, f, cx, y - 10, 30, input.instituteName, input.establishedYear ?? null);

  const sig = async (sx: number, name: string | null | undefined, title: string, img: { bytes: Buffer; mimeType: string } | null | undefined) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = y - 52;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, { x: sx - sw / 2, y: lineY + 6, width: sw, height: Math.min((emb.height / emb.width) * sw, 40) });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), NAVY);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: NAVY });
    if (name) centerText(page, name, sx, lineY - 16, f.helvBold, 9.5, GRAY_DARK);
    centerText(page, title, sx, lineY - 29, f.helv, 8, GRAY);
  };
  await sig(cx - 190, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 190, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR ----
  const qs = 62;
  page.drawRectangle({ x: W - 108, y: 44, width: qs + 10, height: qs + 10, color: WHITE, borderColor: GOLD, borderWidth: 1 });
  drawQrCode(page, input.verifyUrl, { x: W - 103, y: 49, size: qs, color: NAVY });
  centerText(page, "SCAN TO VERIFY", W - 66, 34, f.helvBold, 7, NAVY);

  // verify url footer
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 34, f.helv, 7.5, GRAY);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
