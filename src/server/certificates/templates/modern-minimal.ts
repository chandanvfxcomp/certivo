// src/server/certificates/templates/modern-minimal.ts
//
// Template 6/10 — "Modern Minimal Pro" (PREMIUM, Rs 499).
// Sharp geometric tech-company certificate: white page, bold teal
// left accent bar with a diagonal slash, slate text, left-aligned
// content grid, slanted teal title plate, thin teal rules.
import { rgb } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  WHITE,
  poly, centerText, fitSize, spaced,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

const TEAL = rgb(0.055, 0.486, 0.482); // #0E7C7B
const TEAL_DARK = rgb(0.035, 0.345, 0.345);
const SLATE = rgb(0.184, 0.227, 0.267); // #2F3A44
const SLATE_SOFT = rgb(0.44, 0.49, 0.55);

export async function renderModernMinimal(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;

  // ---- backdrop + geometric left accent ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
  page.drawRectangle({ x: 0, y: 0, width: 58, height: H, color: TEAL });
  // diagonal white slash across the bar
  poly(
    page,
    [
      { x: 0, y: 172 },
      { x: 58, y: 130 },
      { x: 58, y: 114 },
      { x: 0, y: 156 },
    ],
    { color: WHITE, opacity: 0.92 },
  );
  // thin slate pinstripe beside the bar
  page.drawRectangle({ x: 64, y: 0, width: 2, height: H, color: SLATE });
  // small teal square accent, top-right corner
  poly(
    page,
    [
      { x: W - 96, y: H },
      { x: W - 40, y: H },
      { x: W - 40, y: H - 22 },
      { x: W - 74, y: H - 22 },
    ],
    { color: TEAL, opacity: 0.16 },
  );

  // ---- content grid ----
  const gx = 104; // grid left
  const gr = W - 56; // grid right

  // ---- header: logo/monogram + institute ----
  let y = H - 60;
  const logo = await tryEmbedImage(doc, input.logo);
  const logoBox = 46;
  if (logo) {
    const sc = Math.min(logoBox / logo.width, logoBox / logo.height);
    page.drawImage(logo, {
      x: gx,
      y: y - logoBox,
      width: logo.width * sc,
      height: logo.height * sc,
    });
  } else {
    page.drawRectangle({ x: gx, y: y - logoBox, width: logoBox, height: logoBox, color: TEAL });
    const mono = monogramOf(input.instituteName);
    const ms = fitSize(f.helvBold, mono, 32, 22);
    centerText(page, mono, gx + logoBox / 2, y - logoBox / 2 - ms * 0.35, f.helvBold, ms, WHITE);
  }
  const tx = gx + logoBox + 14;
  const nameSize = fitSize(f.helvBold, input.instituteName.toUpperCase(), gr - tx, 21);
  page.drawText(input.instituteName.toUpperCase(), {
    x: tx, y: y - 24, size: nameSize, font: f.helvBold, color: SLATE,
  });
  let ty = y - 44;
  if (input.tagline) {
    const ts = fitSize(f.helvOblique, input.tagline, gr - tx, 11);
    page.drawText(input.tagline, { x: tx, y: ty, size: ts, font: f.helvOblique, color: TEAL_DARK });
    ty -= 16;
  }
  const contactBits = [input.website, input.contactEmail].filter(Boolean) as string[];
  if (contactBits.length > 0) {
    page.drawText(contactBits.join("   |   "), { x: tx, y: ty, size: 8, font: f.helv, color: SLATE_SOFT });
  }
  y = H - 128;
  page.drawLine({ start: { x: gx, y }, end: { x: gr, y }, thickness: 2, color: TEAL });

  // ---- title plate (slanted teal block, white sans title) ----
  y -= 32; // plateTop = H - 160
  const plateTop = y;
  const plateH = 52;
  poly(
    page,
    [
      { x: gx, y: plateTop },
      { x: gx + 336, y: plateTop },
      { x: gx + 318, y: plateTop - plateH },
      { x: gx, y: plateTop - plateH },
    ],
    { color: TEAL },
  );
  const titleSize = fitSize(f.helvBold, "CERTIFICATE", 296, 30);
  page.drawText("CERTIFICATE", {
    x: gx + 20, y: plateTop - 38, size: titleSize, font: f.helvBold, color: WHITE,
  });
  const sub = spaced("OF COMPLETION");
  page.drawText(sub, { x: gx + 360, y: plateTop - 32, size: 12, font: f.helvBold, color: TEAL_DARK });

  y = plateTop - plateH - 20;
  page.drawText("This certificate is proudly presented to", {
    x: gx, y, size: 10.5, font: f.helv, color: SLATE_SOFT,
  });

  // ---- student name (script) ----
  y -= 46;
  const sSize = fitSize(f.script, input.studentName, gr - gx, 40);
  page.drawText(input.studentName, { x: gx, y, size: sSize, font: f.script, color: TEAL_DARK });
  const sW = f.script.widthOfTextAtSize(input.studentName, sSize);
  y -= 8;
  page.drawLine({
    start: { x: gx, y }, end: { x: Math.min(gx + sW, gr), y }, thickness: 1.4, color: TEAL,
  });

  // ---- course ----
  y -= 26;
  page.drawText("has successfully completed the requirements for the program", {
    x: gx, y, size: 10.5, font: f.helv, color: SLATE_SOFT,
  });
  y -= 24;
  const cSize = fitSize(f.helvBold, input.courseName, gr - gx - 130, 16);
  page.drawText(input.courseName, { x: gx, y, size: cSize, font: f.helvBold, color: SLATE });

  // ---- QR (right column) ----
  const qs = 76;
  const qx = gr - qs - 8;
  const qy = plateTop - 118;
  page.drawRectangle({
    x: qx - 6, y: qy - 6, width: qs + 12, height: qs + 12,
    color: WHITE, borderColor: TEAL, borderWidth: 1,
  });
  drawQrCode(page, input.verifyUrl, { x: qx, y: qy, size: qs, color: TEAL_DARK });
  centerText(page, "SCAN TO VERIFY", qx + qs / 2, qy - 20, f.helvBold, 7, TEAL_DARK);

  // ---- info strip ----
  y -= 48;
  page.drawLine({ start: { x: gx, y }, end: { x: gr, y }, thickness: 1.4, color: TEAL });
  y -= 18;
  const cells: Array<[string, string]> = [
    ["CERTIFICATE ID", input.code],
    ["DATE OF ISSUE", formatCertDate(input.issuedAt)],
    ["MODE", input.mode || "-"],
    ["GRADE", input.grade || "-"],
  ];
  const colW = (gr - gx) / cells.length;
  cells.forEach(([label, value], i) => {
    const cx0 = gx + colW * i;
    page.drawText(label, { x: cx0, y, size: 7, font: f.helvBold, color: TEAL_DARK });
    page.drawText(value, {
      x: cx0, y: y - 15,
      size: fitSize(f.helvBold, value, colW - 12, 10.5),
      font: f.helvBold, color: SLATE,
    });
    if (i > 0) {
      page.drawLine({
        start: { x: cx0 - 10, y: y + 8 }, end: { x: cx0 - 10, y: y - 22 },
        thickness: 0.8, color: TEAL,
      });
    }
  });
  y -= 34;
  page.drawLine({ start: { x: gx, y }, end: { x: gr, y }, thickness: 1.4, color: TEAL });

  // ---- seal + signatures ----
  y -= 30;
  drawSeal(page, f, gx + (gr - gx) / 2, y - 4, 28, input.instituteName, input.establishedYear ?? null, {
    ring: TEAL,
    band: TEAL_DARK,
    face: WHITE,
    text: WHITE,
  });

  const sig = async (
    sx: number,
    name: string | null | undefined,
    title: string,
    img: { bytes: Buffer; mimeType: string } | null | undefined,
  ) => {
    const emb = await tryEmbedImage(doc, img);
    const lineY = y - 34;
    if (emb) {
      const sw = 110;
      page.drawImage(emb, {
        x: sx - sw / 2, y: lineY + 6, width: sw,
        height: Math.min((emb.height / emb.width) * sw, 38),
      });
    } else if (name) {
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), TEAL_DARK);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: SLATE });
    if (name) centerText(page, name, sx, lineY - 15, f.helvBold, 9.5, SLATE);
    centerText(page, title, sx, lineY - 28, f.helv, 8, SLATE_SOFT);
  };
  await sig(gx + 90, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(gr - 90, input.authorityName, "Authority", input.authoritySignature);

  // ---- footer ----
  page.drawLine({ start: { x: gx, y: 44 }, end: { x: gr, y: 44 }, thickness: 0.8, color: TEAL });
  page.drawText(`Verify at ${input.verifyUrl}`, { x: gx, y: 28, size: 7.5, font: f.helv, color: SLATE_SOFT });
  const idTxt = `ID: ${input.code}`;
  const idW = f.helv.widthOfTextAtSize(idTxt, 7.5);
  page.drawText(idTxt, { x: gr - idW, y: 28, size: 7.5, font: f.helv, color: SLATE_SOFT });

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
