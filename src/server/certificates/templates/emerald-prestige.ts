// src/server/certificates/templates/emerald-prestige.ts
//
// Template 3/10 — "Emerald Prestige" (PREMIUM, ₹499).
// Regal deep-emerald full-bleed design: emerald page, inner ivory
// panel with a double gold border, gold corner flourishes, gold serif
// institute header, gold dividers and an emerald-and-gold seal.
import { rgb, type PDFPage, type RGB } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  GOLD, GOLD_LIGHT, GOLD_DARK, GRAY, GRAY_DARK, CREAM,
  centerText, fitSize, spaced, goldRule, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

const EMERALD = rgb(0.043, 0.302, 0.2); // #0B4D33
const EMERALD_DEEP = rgb(0.027, 0.216, 0.141);
const EMERALD_INK = rgb(0.02, 0.16, 0.11);

/** Gold corner flourish: diamond, leaf pairs and hairlines sweeping inward. */
function cornerFlourish(
  page: PDFPage,
  x: number,
  y: number,
  dx: 1 | -1,
  dy: 1 | -1,
  color: RGB,
) {
  const d = 6;
  poly(
    page,
    [
      { x, y: y + d },
      { x: x + d, y },
      { x, y: y - d },
      { x: x - d, y },
    ],
    { color },
  );
  const leaf = (lx: number, ly: number, horiz: boolean) => {
    const L = 11, w = 3.6;
    if (horiz) {
      poly(
        page,
        [
          { x: lx, y: ly },
          { x: lx + dx * L * 0.5, y: ly + w },
          { x: lx + dx * L, y: ly },
          { x: lx + dx * L * 0.5, y: ly - w },
        ],
        { color },
      );
    } else {
      poly(
        page,
        [
          { x: lx, y: ly },
          { x: lx + w, y: ly + dy * L * 0.5 },
          { x: lx, y: ly + dy * L },
          { x: lx - w, y: ly + dy * L * 0.5 },
        ],
        { color },
      );
    }
  };
  leaf(x + dx * 18, y, true);
  leaf(x + dx * 36, y, true);
  leaf(x, y + dy * 18, false);
  leaf(x, y + dy * 36, false);
  page.drawLine({ start: { x: x + dx * 10, y }, end: { x: x + dx * 52, y }, thickness: 1, color });
  page.drawLine({ start: { x, y: y + dy * 10 }, end: { x, y: y + dy * 52 }, thickness: 1, color });
}

export async function renderEmeraldPrestige(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // ---- full-bleed emerald backdrop ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: EMERALD });
  // subtle deeper emerald vignette bands at top and bottom edges
  page.drawRectangle({ x: 0, y: H - 14, width: W, height: 14, color: EMERALD_DEEP });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 14, color: EMERALD_DEEP });

  // ---- header: logo + institute name in gold serif on emerald ----
  const logo = await tryEmbedImage(doc, input.logo);
  if (logo) {
    const s = 50;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, {
      x: cx - (logo.width * sc) / 2,
      y: H - 36 - s,
      width: logo.width * sc,
      height: logo.height * sc,
    });
  } else {
    // gold medallion with monogram fallback
    page.drawCircle({ x: cx, y: H - 62, size: 24, color: GOLD });
    page.drawCircle({ x: cx, y: H - 62, size: 21, color: EMERALD_DEEP });
    const mono = monogramOf(input.instituteName);
    centerText(page, mono, cx, H - 62 - 8, f.serif, fitSize(f.serif, mono, 34, 20), GOLD_LIGHT);
  }
  const nameY = H - 108;
  const nameSize = fitSize(f.serif, input.instituteName.toUpperCase(), W - 280, 30);
  centerText(page, input.instituteName.toUpperCase(), cx, nameY, f.serif, nameSize, GOLD_LIGHT);
  if (input.tagline) {
    centerText(
      page, input.tagline, cx, nameY - 22,
      f.helvOblique, fitSize(f.helvOblique, input.tagline, 420, 11.5), GOLD,
    );
  }
  goldRule(page, cx, nameY - 36, 160, GOLD);

  // ---- inner ivory panel with double gold border ----
  const px = 42, py = 64, pw = W - 84, ph = H - 152 - 64;
  page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: CREAM });
  page.drawRectangle({ x: px, y: py, width: pw, height: ph, borderColor: GOLD, borderWidth: 2.5 });
  page.drawRectangle({
    x: px + 8, y: py + 8, width: pw - 16, height: ph - 16,
    borderColor: GOLD, borderWidth: 0.8,
  });
  cornerFlourish(page, px, py, 1, 1, GOLD);
  cornerFlourish(page, px + pw, py, -1, 1, GOLD);
  cornerFlourish(page, px, py + ph, 1, -1, GOLD);
  cornerFlourish(page, px + pw, py + ph, -1, -1, GOLD);

  // ---- certificate body ----
  const top = py + ph;
  let y = top - 52;
  centerText(page, "CERTIFICATE", cx, y, f.serif, 40, EMERALD_INK);
  y -= 30;
  centerText(page, spaced("OF ACHIEVEMENT"), cx, y, f.helvBold, 12, GOLD_DARK);
  y -= 15;
  goldRule(page, cx, y, 190, GOLD);
  y -= 24;
  centerText(page, spaced("THIS CERTIFICATE IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, GRAY);
  y -= 42;
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 460, 44), EMERALD_INK);
  y -= 26;
  goldRule(page, cx, y, 150, GOLD);
  y -= 22;
  centerText(page, "has successfully completed the course", cx, y, f.helvOblique, 11, GRAY);
  y -= 26;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 500, 20), EMERALD_INK);
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
    centerText(page, label, ccx, y + 14, f.helv, 7, GOLD_DARK);
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), EMERALD_INK);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 1, color: GOLD });
    }
  });
  // ---- seal + signatures ----
  // Fixed row: seal centre 116 (spans 88-144), signature rules at 108,
  // titles at 79 — clear of the info strip above and panel edge below.
  const rowY = 108;
  drawSeal(page, f, cx, rowY + 8, 28, input.instituteName, input.establishedYear ?? null, {
    ring: GOLD, band: EMERALD_DEEP, face: GOLD, text: GOLD_LIGHT,
  });

  const sig = async (
    sx: number, name: string | null | undefined, title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = rowY;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, { x: sx - sw / 2, y: lineY + 6, width: sw, height: Math.min((emb.height / emb.width) * sw, 40) });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), EMERALD_INK);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: EMERALD_INK });
    if (name) centerText(page, name, sx, lineY - 16, f.helvBold, 9.5, GRAY_DARK);
    centerText(page, title, sx, lineY - 29, f.helv, 8, GOLD_DARK);
  };
  await sig(cx - 195, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 195, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR (bottom-right inside the panel) ----
  const qs = 54;
  const bx = W - 50 - 72, by = 80;
  page.drawRectangle({ x: bx, y: by, width: 72, height: 72, color: GOLD_LIGHT, borderColor: GOLD, borderWidth: 1 });
  drawQrCode(page, input.verifyUrl, { x: bx + 9, y: by + 9, size: qs, color: EMERALD_INK });
  centerText(page, "SCAN TO VERIFY", bx + 36, by - 11, f.helvBold, 7, GOLD_DARK);

  // ---- verify footer on emerald ----
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 32, f.helv, 8, GOLD_LIGHT);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
