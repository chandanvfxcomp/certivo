// src/server/certificates/templates/platinum-elite.ts
//
// Template 10/10 — "Platinum Elite" (PREMIUM, ₹999). The flagship:
// deep-navy full-bleed background, platinum double border, wide
// letterspaced platinum serif, a soft radial glow behind the centre,
// and a platinum seal. The most refined template in the set.
import { rgb, type PDFPage } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  WHITE,
  centerText, fitSize, spaced, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

// ---------------------------------------------------------------- palette
const BG = rgb(0.039, 0.078, 0.251); // deep navy (#0A1440)
const BG_DEEP = rgb(0.02, 0.045, 0.15); // darker navy for depth
const PLAT = rgb(0.82, 0.84, 0.9); // bright platinum silver
const PLAT_LIGHT = rgb(0.94, 0.95, 0.98); // near-white silver
const PLAT_DIM = rgb(0.58, 0.61, 0.7); // muted silver for secondary text

/** Fine platinum divider: two hairlines with a centre diamond. */
function platinumRule(page: PDFPage, cx: number, y: number, halfWidth: number) {
  page.drawLine({ start: { x: cx - halfWidth, y }, end: { x: cx - 12, y }, thickness: 0.8, color: PLAT_DIM });
  page.drawLine({ start: { x: cx + 12, y }, end: { x: cx + halfWidth, y }, thickness: 0.8, color: PLAT_DIM });
  const d = 4.5;
  poly(
    page,
    [
      { x: cx, y: y + d },
      { x: cx + d, y },
      { x: cx, y: y - d },
      { x: cx - d, y },
    ],
    { color: PLAT },
  );
}

export async function renderPlatinumElite(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // ---- deep-navy full bleed ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });

  // ---- soft radial glow behind the centre ----
  for (const r of [70, 105, 140, 175, 210, 245]) {
    page.drawCircle({ x: cx, y: 290, size: r, color: PLAT, opacity: 0.028 });
  }

  // ---- platinum double border ----
  page.drawRectangle({ x: 16, y: 16, width: W - 32, height: H - 32, borderColor: PLAT, borderWidth: 2.2 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: PLAT_DIM, borderWidth: 0.8 });
  // corner diamonds
  for (const [dx, dy] of [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]] as Array<[number, number]>) {
    const d = 6;
    poly(
      page,
      [
        { x: dx, y: dy + d },
        { x: dx + d, y: dy },
        { x: dx, y: dy - d },
        { x: dx - d, y: dy },
      ],
      { color: PLAT },
    );
  }

  // ---- header: logo + institute ----
  const logo = await tryEmbedImage(doc, input.logo);
  if (logo) {
    const s = 56;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, {
      x: cx - (logo.width * sc) / 2,
      y: H - 88,
      width: logo.width * sc,
      height: logo.height * sc,
    });
  } else {
    page.drawCircle({ x: cx, y: H - 58, size: 27, color: PLAT });
    page.drawCircle({ x: cx, y: H - 58, size: 24, color: BG_DEEP });
    const mono = monogramOf(input.instituteName);
    centerText(page, mono, cx, H - 58 - 8, f.serif, fitSize(f.serif, mono, 34, 20), PLAT_LIGHT);
  }
  centerText(
    page,
    input.instituteName.toUpperCase(),
    cx,
    H - 128,
    f.serif,
    fitSize(f.serif, input.instituteName.toUpperCase(), W - 280, 23),
    PLAT_LIGHT,
  );
  if (input.tagline) {
    centerText(page, input.tagline, cx, H - 148, f.helvOblique, fitSize(f.helvOblique, input.tagline, 420, 10.5), PLAT_DIM);
  }
  platinumRule(page, cx, H - 166, 170);

  // ---- title ----
  let y = H - 208;
  const title = spaced("CERTIFICATE");
  centerText(page, title, cx, y, f.serif, fitSize(f.serif, title, W - 280, 40), PLAT_LIGHT);
  y -= 30;
  centerText(page, spaced("OF COMPLETION"), cx, y, f.helvBold, 11, PLAT_DIM);
  y -= 26;
  centerText(page, spaced("THIS IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, PLAT_DIM);
  y -= 44;
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 460, 44), PLAT_LIGHT);
  y -= 30;
  platinumRule(page, cx, y, 150);
  y -= 26;
  centerText(page, "has successfully completed", cx, y, f.helvOblique, 11, PLAT_DIM);
  y -= 24;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 480, 18), PLAT_LIGHT);
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
    centerText(page, label, ccx, y + 14, f.helv, 7, PLAT_DIM);
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), PLAT_LIGHT);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 0.8, color: PLAT_DIM });
    }
  });
  y -= 48;

  // ---- platinum seal + signatures ----
  // Silver ring, navy band, silver face. ESTD is skipped because the
  // face is silver (silver-on-silver would be invisible).
  drawSeal(page, f, cx, y - 8, 29, input.instituteName, null, {
    ring: PLAT,
    band: BG_DEEP,
    face: PLAT_LIGHT,
    text: PLAT_LIGHT,
  });

  const sig = async (
    sx: number,
    name: string | null | undefined,
    title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = y - 44;
    if (emb) {
      // Signature scans are usually dark ink on white: back them with a
      // small white plate so they read cleanly on the navy background.
      const sw = 110;
      page.drawRectangle({ x: sx - sw / 2 - 4, y: lineY + 2, width: sw + 8, height: 44, color: WHITE });
      page.drawImage(emb, { x: sx - sw / 2, y: lineY + 6, width: sw, height: Math.min((emb.height / emb.width) * sw, 36) });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), PLAT_LIGHT);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 0.9, color: PLAT_DIM });
    if (name) centerText(page, name, sx, lineY - 15, f.helvBold, 9.5, PLAT_LIGHT);
    centerText(page, title, sx, lineY - 27, f.helv, 8, PLAT_DIM);
  };
  await sig(cx - 200, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 200, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR on a white plate for contrast ----
  const qs = 62;
  page.drawRectangle({ x: W - 116, y: 140, width: qs + 12, height: qs + 12, color: WHITE });
  drawQrCode(page, input.verifyUrl, { x: W - 110, y: 146, size: qs, color: BG });
  centerText(page, "SCAN TO VERIFY", W - 71, 128, f.helvBold, 7, PLAT);

  // ---- verify URL footer ----
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 40, f.helv, 7.5, PLAT_DIM);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
