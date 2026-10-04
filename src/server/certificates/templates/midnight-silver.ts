// src/server/certificates/templates/midnight-silver.ts
//
// Template — "Midnight Silver" (PREMIUM, ₹499).
// Elegant night-time design: deep midnight-blue full-bleed background,
// thin silver/platinum double border, all text in white/silver, silver
// serif title with letterspacing, subtle diagonal sheen, silver seal.
import { rgb } from "pdf-lib";
import type { TemplateContext } from "./types";
import { formatCertDate, monogramOf } from "./types";
import {
  centerText, fitSize, spaced, poly,
  drawQrCode, drawSeal, tryEmbedImage, drawPreviewWatermark,
} from "./shared";

// ---------------------------------------------------------------- palette
const MID = rgb(0.039, 0.071, 0.188); // deep midnight blue #0A1230-ish
const MID_DEEP = rgb(0.027, 0.051, 0.137);
const SILVER = rgb(0.75, 0.78, 0.85); // platinum
const SILVER_LIGHT = rgb(0.89, 0.91, 0.96);
const SILVER_DIM = rgb(0.6, 0.63, 0.72);
const WHITE = rgb(1, 1, 1);

export async function renderMidnightSilver(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;
  const cx = W / 2;

  // ---- backdrop: full-bleed midnight ----
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: MID });

  // subtle diagonal sheen
  poly(page, [
    { x: 170, y: 0 }, { x: 310, y: 0 },
    { x: 620, y: H }, { x: 480, y: H },
  ], { color: SILVER, opacity: 0.05 });
  poly(page, [
    { x: 560, y: 0 }, { x: 640, y: 0 },
    { x: 841.89, y: H }, { x: 762, y: H },
  ], { color: SILVER, opacity: 0.032 });

  // giant faint monogram behind the content (kept low to avoid the header)
  const mono = monogramOf(input.instituteName);
  {
    const ws = 190;
    const ww = f.serif.widthOfTextAtSize(mono, ws);
    page.drawText(mono, {
      x: cx - ww / 2, y: 120, size: ws, font: f.serif,
      color: SILVER, opacity: 0.035,
    });
  }

  // ---- thin silver/platinum double border ----
  page.drawRectangle({ x: 16, y: 16, width: W - 32, height: H - 32, borderColor: SILVER, borderWidth: 1.6 });
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: SILVER, borderWidth: 0.6 });
  // brightened corner ticks on the inner border
  const tick = (x: number, y: number, sx: number, sy: number) => {
    page.drawLine({ start: { x, y }, end: { x: x + sx * 16, y }, thickness: 2, color: SILVER_LIGHT });
    page.drawLine({ start: { x, y }, end: { x, y: y + sy * 16 }, thickness: 2, color: SILVER_LIGHT });
  };
  tick(24, 24, 1, 1); tick(W - 24, 24, -1, 1);
  tick(24, H - 24, 1, -1); tick(W - 24, H - 24, -1, -1);

  // ---- header: logo (or silver monogram badge) + institute ----
  const logo = await tryEmbedImage(doc, input.logo);
  let y = H - 78;
  if (logo) {
    const s = 56;
    const sc = Math.min(s / logo.width, s / logo.height);
    page.drawImage(logo, {
      x: cx - (logo.width * sc) / 2, y: y - 6,
      width: logo.width * sc, height: logo.height * sc,
    });
    y -= 60;
  } else {
    page.drawCircle({ x: cx, y: y - 24, size: 27, borderColor: SILVER, borderWidth: 1.6 });
    page.drawCircle({ x: cx, y: y - 24, size: 22.5, borderColor: SILVER_DIM, borderWidth: 0.7 });
    const ms = fitSize(f.serif, mono, 34, 20);
    centerText(page, mono, cx, y - 24 - ms * 0.34, f.serif, ms, SILVER_LIGHT);
    y -= 58;
  }
  const nameSize = fitSize(f.serif, input.instituteName.toUpperCase(), W - 240, 26);
  centerText(page, input.instituteName.toUpperCase(), cx, y, f.serif, nameSize, WHITE);
  y -= 22;
  if (input.tagline) {
    centerText(page, input.tagline, cx, y, f.helvOblique, fitSize(f.helvOblique, input.tagline, 400, 11.5), SILVER_LIGHT);
    y -= 20;
  }
  // silver side rules with centre diamond
  page.drawLine({ start: { x: cx - 250, y }, end: { x: cx - 14, y }, thickness: 0.8, color: SILVER });
  page.drawLine({ start: { x: cx + 14, y }, end: { x: cx + 250, y }, thickness: 0.8, color: SILVER });
  poly(page, [
    { x: cx, y: y + 4 }, { x: cx + 4, y },
    { x: cx, y: y - 4 }, { x: cx - 4, y },
  ], { color: SILVER_LIGHT });
  y -= 32;

  // ---- title ----
  centerText(page, spaced("CERTIFICATE"), cx, y, f.serif, 42, SILVER_LIGHT);
  y -= 30;
  centerText(page, spaced("OF COMPLETION"), cx, y, f.helvBold, 12.5, WHITE);
  y -= 20;
  if (input.motto) {
    centerText(page, input.motto, cx, y, f.deva, fitSize(f.deva, input.motto, 420, 11.5), SILVER_DIM);
    y -= 20;
  }
  centerText(page, spaced("THIS IS PROUDLY PRESENTED TO"), cx, y, f.helv, 8, SILVER_DIM);
  y -= 42;

  // ---- student ----
  centerText(page, input.studentName, cx, y, f.script, fitSize(f.script, input.studentName, 470, 44), WHITE);
  y -= 30;
  page.drawLine({ start: { x: cx - 150, y }, end: { x: cx + 150, y }, thickness: 0.8, color: SILVER_DIM });
  y -= 26;
  centerText(page, "has successfully completed", cx, y, f.helvOblique, 11, SILVER_LIGHT);
  y -= 24;
  centerText(page, input.courseName, cx, y, f.serif, fitSize(f.serif, input.courseName, 500, 18.5), SILVER_LIGHT);
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
    centerText(page, label, ccx, y + 14, f.helv, 7, SILVER_DIM);
    centerText(page, value, ccx, y, f.helvBold, fitSize(f.helvBold, value, colW - 16, 10), WHITE);
    if (i > 0) {
      page.drawLine({ start: { x: x0 + colW * i, y: y - 6 }, end: { x: x0 + colW * i, y: y + 22 }, thickness: 1, color: SILVER });
    }
  });
  y -= 58;

  // ---- silver seal ----
  drawSeal(page, f, cx, y - 10, 30, input.instituteName, input.establishedYear ?? null, {
    ring: SILVER,
    band: MID_DEEP,
    face: SILVER,
    text: rgb(0.92, 0.94, 1),
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
      centerText(page, name, sx, lineY + 8, f.script, fitSize(f.script, name, 150, 22), WHITE);
    }
    page.drawLine({ start: { x: sx - 75, y: lineY }, end: { x: sx + 75, y: lineY }, thickness: 1, color: SILVER });
    if (name) centerText(page, name, sx, lineY - 16, f.helvBold, 9.5, SILVER_LIGHT);
    centerText(page, title, sx, lineY - 29, f.helv, 8, SILVER_DIM);
  };
  await sig(cx - 190, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  await sig(cx + 190, input.authorityName, "Authority", input.authoritySignature);

  // ---- QR (white box so it scans on dark) ----
  const qs = 62;
  page.drawRectangle({ x: W - 108, y: 44, width: qs + 10, height: qs + 10, color: WHITE, borderColor: SILVER, borderWidth: 1 });
  drawQrCode(page, input.verifyUrl, { x: W - 103, y: 49, size: qs, color: MID_DEEP });
  centerText(page, "SCAN TO VERIFY", W - 66, 34, f.helvBold, 7, SILVER);

  // verify url footer
  centerText(page, `Verify at ${input.verifyUrl}`, cx, 34, f.helv, 7.5, SILVER_DIM);

  if (watermark) drawPreviewWatermark(page, f, W, H);
}
