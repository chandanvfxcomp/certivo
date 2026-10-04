// src/server/certificates/templates/crimson-laurel.ts
//
// Template 4/10 — "Crimson Laurel" (PREMIUM, ₹499).
// Rich maroon-and-gold design: cream page, full-width maroon banner
// with the gold CERTIFICATE title, thin maroon double border, a gold
// laurel wreath drawn around the seal, and signature blocks at bottom.
import { rgb, type PDFPage, type RGB } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  GOLD, GOLD_LIGHT, GOLD_DARK, GRAY, GRAY_DARK, WHITE, CREAM,
  centerText, fitSize, spaced, goldRule, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

const MAROON = rgb(0.482, 0.118, 0.169); // #7B1E2B
const MAROON_DEEP = rgb(0.349, 0.078, 0.118);
const MAROON_INK = rgb(0.31, 0.07, 0.106);

/**
 * Laurel wreath: two curved branches (stems) with small angled leaf
 * shapes, swept symmetrically around the seal. Left open at the top,
 * joined by a small diamond at the bottom.
 */
function drawLaurel(page: PDFPage, cx: number, cy: number, r: number, color: RGB) {
  const R = r + 13;
  for (const side of [-1, 1] as const) {
    const n = 8;
    let prev: { x: number; y: number } | null = null;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      // right branch: -60° → +60°; left branch: 240° → 120°
      const aDeg = side === 1 ? -60 + t * 120 : 240 - t * 120;
      const a = (aDeg * Math.PI) / 180;
      const ux = Math.cos(a), uy = Math.sin(a); // radial
      const vx = -Math.sin(a), vy = Math.cos(a); // tangent
      const dir = side; // direction of travel along the branch
      const px = cx + R * ux, py = cy + R * uy;
      if (prev) {
        page.drawLine({ start: prev, end: { x: px, y: py }, thickness: 1.4, color });
      }
      prev = { x: px, y: py };
      // leaf: elongated diamond angled outward along the stem
      const tipX = px + vx * dir * 9 + ux * 3;
      const tipY = py + vy * dir * 9 + uy * 3;
      poly(
        page,
        [
          { x: tipX, y: tipY },
          { x: px + ux * 3.6, y: py + uy * 3.6 },
          { x: px, y: py },
          { x: px - ux * 3.6, y: py - uy * 3.6 },
        ],
        { color },
      );
    }
  }
  // small diamond joining the branches at the bottom
  const bx = cx, by = cy - R - 2, d = 5;
  poly(
    page,
    [
      { x: bx, y: by + d },
      { x: bx + d, y: by },
      { x: bx, y: by - d },
      { x: bx - d, y: by },
    ],
    { color },
  );
}

export async function renderCrimsonLaurel(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // ---- cream backdrop ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: CREAM });

  // ---- maroon top banner with gold title ----
  const bannerH = 108;
  page.drawRectangle({ x: 0, y: H - bannerH, width: W, height: bannerH, color: MAROON });
  page.drawLine({ start: { x: 0, y: H - bannerH }, end: { x: W, y: H - bannerH }, thickness: 2, color: GOLD });
  page.drawLine({ start: { x: 0, y: H - 8 }, end: { x: W, y: H - 8 }, thickness: 1, color: GOLD_DARK });
  centerText(page, "CERTIFICATE", cx, H - 58, f.serif, 36, GOLD_LIGHT);
  centerText(page, spaced("OF ACHIEVEMENT"), cx, H - 82, f.helvBold, 11, GOLD);

  // ---- thin maroon double border ----
  page.drawRectangle({ x: 16, y: 16, width: W - 32, height: H - 32, borderColor: MAROON, borderWidth: 2 });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: GOLD, borderWidth: 0.8 });
  // corner diamonds on the maroon frame
  const corners: Array<[number, number]> = [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]];
  for (const [dx, dy] of corners) {
    const d = 5;
    poly(page, [
      { x: dx, y: dy + d }, { x: dx + d, y: dy },
      { x: dx, y: dy - d }, { x: dx - d, y: dy },
    ], { color: GOLD });
  }

  // ---- header: logo + institute name in maroon ----
  const logo = await tryEmbedImage(doc, input.logo);
  const headerTop = H - bannerH - 28;
  let nameY: number;
  if (logo) {
    const s = 46;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, {
      x: cx - (logo.width * sc) / 2,
      y: headerTop - s,
      width: logo.width * sc,
      height: logo.height * sc,
    });
    nameY = headerTop - s - 20;
  } else {
    page.drawCircle({ x: cx, y: headerTop - 22, size: 22, color: MAROON });
    page.drawCircle({ x: cx, y: headerTop - 22, size: 19, borderColor: GOLD, borderWidth: 1.2 });
    const mono = monogramOf(input.instituteName);
    centerText(page, mono, cx, headerTop - 22 - 7, f.serif, fitSize(f.serif, mono, 30, 18), GOLD_LIGHT);
    nameY = headerTop - 58;
  }
  centerText(
    page, input.instituteName.toUpperCase(), cx, nameY,
    f.serif, fitSize(f.serif, input.instituteName.toUpperCase(), W - 240, 26), MAROON_INK,
  );
  if (input.tagline) {
    centerText(
      page, input.tagline, cx, nameY - 22,
      f.helvOblique, fitSize(f.helvOblique, input.tagline, 420, 11.5), GOLD_DARK,
    );
  }
  goldRule(page, cx, nameY - 36, 170, MAROON);

  // ---- presented-to block ----
  let y = nameY - 60;
  centerText(page, spaced("THIS CERTIFICATE IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, GRAY);
  y -= 38;
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 460, 44), MAROON_INK);
  y -= 26;
  goldRule(page, cx, y, 150, GOLD);
  y -= 22;
  centerText(page, "has successfully completed the course", cx, y, f.helvOblique, 11, GRAY);
  y -= 26;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 500, 20), MAROON_INK);
  y -= 40;

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
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), MAROON_INK);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 1, color: GOLD });
    }
  });

  // ---- seal wrapped in laurel + signature blocks at bottom ----
  // Positioned relative to the info strip so the laurel never collides
  // with it, in both logo and monogram header variants.
  const sealCy = y - 56;
  drawSeal(page, f, cx, sealCy, 26, input.instituteName, input.establishedYear ?? null, {
    ring: GOLD, band: MAROON_DEEP, face: GOLD_LIGHT, text: WHITE,
  });
  drawLaurel(page, cx, sealCy, 26, GOLD_DARK);

  const sig = async (
    sx: number, name: string | null | undefined, title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = sealCy - 44;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, { x: sx - sw / 2, y: lineY + 6, width: sw, height: Math.min((emb.height / emb.width) * sw, 40) });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), MAROON_INK);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: MAROON });
    if (name) centerText(page, name, sx, lineY - 16, f.helvBold, 9.5, GRAY_DARK);
    centerText(page, title, sx, lineY - 29, f.helv, 8, GRAY);
  };
  await sig(cx - 200, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 200, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR bottom-right ----
  const qs = 62;
  page.drawRectangle({ x: W - 110, y: 46, width: qs + 10, height: qs + 10, color: WHITE, borderColor: GOLD, borderWidth: 1 });
  drawQrCode(page, input.verifyUrl, { x: W - 105, y: 51, size: qs, color: MAROON });
  centerText(page, "SCAN TO VERIFY", W - 69, 36, f.helvBold, 7, MAROON);

  // ---- verify footer ----
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 30, f.helv, 7.5, GRAY);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
