// src/server/certificates/templates/royal-heritage.ts
//
// Template 2/10 — "Royal Heritage" (PREMIUM).
// The ornate navy & gold design: left navy panel, header with logo,
// CERTIFICATE OF COMPLETION, script name, info strip, right column
// with medal + QR + hologram, two signatures with gold seal,
// bottom navy strip and wave.
import { degrees, type PDFPage, type RGB } from "pdf-lib";
import type { CertificateImage } from "../generate-pdf";
import type { TemplateContext } from "./types";
import { formatCertDate } from "./types";
import {
  NAVY, NAVY_DEEP, NAVY_SOFT, GOLD, GOLD_LIGHT, GOLD_DARK, ORANGE, GREEN,
  GRAY, GRAY_DARK, WHITE, CREAM,
  spaced, fitSize, centerText, goldRule, poly,
  tryEmbedImage, drawQrCode, drawSeal, drawLotus, drawIndiaMap,
  drawPreviewWatermark, iconShield, iconCap,
} from "./shared";

export async function renderRoyalHeritage(ctx: TemplateContext): Promise<void> {
  const { doc, page, f, input, W, H, watermark } = ctx;

  // local icons (not in shared)
  const iconMonitor = (pg: PDFPage, cx: number, y: number, s: number, color: RGB) => {
    pg.drawRectangle({ x: cx - s, y: y - s * 0.35, width: s * 2, height: s * 1.3, borderColor: color, borderWidth: 1.4 });
    pg.drawLine({ start: { x: cx, y: y - s * 0.35 }, end: { x: cx, y: y - s * 0.85 }, thickness: 1.4, color });
    pg.drawLine({ start: { x: cx - s * 0.5, y: y - s * 0.85 }, end: { x: cx + s * 0.5, y: y - s * 0.85 }, thickness: 1.4, color });
  };
  const iconChart = (pg: PDFPage, cx: number, y: number, s: number, color: RGB) => {
    const bw = s * 0.42;
    [0.7, 1.2, 1.7].forEach((hh, i) => {
      const x = cx - s + i * (bw + s * 0.18);
      pg.drawRectangle({ x, y: y - s * 0.9, width: bw, height: s * hh, borderColor: color, borderWidth: 1.2 });
    });
  };
  const iconPeople = (pg: PDFPage, cx: number, y: number, s: number, color: RGB) => {
    pg.drawCircle({ x: cx - s * 0.45, y: y + s * 0.35, size: s * 0.42, borderColor: color, borderWidth: 1.3 });
    pg.drawCircle({ x: cx + s * 0.45, y: y + s * 0.35, size: s * 0.42, borderColor: color, borderWidth: 1.3 });
    pg.drawLine({ start: { x: cx - s * 1.05, y: y - s * 0.85 }, end: { x: cx - s * 1.05, y: y - s * 0.25 }, thickness: 1.3, color });
    pg.drawLine({ start: { x: cx + s * 0.15, y: y - s * 0.85 }, end: { x: cx + s * 0.15, y: y - s * 0.25 }, thickness: 1.3, color });
    pg.drawLine({ start: { x: cx - s * 1.05, y: y - s * 0.25 }, end: { x: cx + s * 0.15, y: y - s * 0.25 }, thickness: 1.3, color });
  };
  const iconGear = (pg: PDFPage, cx: number, y: number, s: number, color: RGB) => {
    pg.drawCircle({ x: cx, y, size: s * 0.55, borderColor: color, borderWidth: 1.4 });
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      pg.drawLine({
        start: { x: cx + Math.cos(a) * s * 0.62, y: y + Math.sin(a) * s * 0.62 },
        end: { x: cx + Math.cos(a) * s * 0.95, y: y + Math.sin(a) * s * 0.95 },
        thickness: 1.4, color,
      });
    }
  };

  // ---- backdrop: white with a whisper of cream texture ---------------------
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
  // faint diagonal sheen bands
  for (let i = 0; i < 3; i++) {
    poly(page, [
        { x: 150 + i * 220, y: H },
        { x: 230 + i * 220, y: H },
        { x: 130 + i * 220, y: 0 },
        { x: 50 + i * 220, y: 0 },
      ], { color: CREAM, opacity: 0.5 },
    );
  }
  // watermark monogram
  const words = input.instituteName.trim().split(/\s+/);
  const mono = ((words[0]?.[0] ?? "C") + (words[1]?.[0] ?? "")).toUpperCase();
  {
    const ws = 190;
    const ww = f.serif.widthOfTextAtSize(mono, ws);
    page.drawText(mono, {
      x: W / 2 - ww / 2,
      y: 200,
      size: ws,
      font: f.serif,
      color: NAVY,
      opacity: 0.035,
    });
  }

  // =========================================================================
  // LEFT NAVY PANEL  (x 0 → 150)
  // =========================================================================
  const PW = 150;
  page.drawRectangle({ x: 0, y: 0, width: PW, height: H, color: NAVY_DEEP });
  // gold diagonal slash at the panel's top-right
  poly(page, [
      { x: PW - 34, y: H },
      { x: PW, y: H },
      { x: PW, y: H - 120 },
    ], { color: GOLD },
  );
  poly(
    page,
    [
      { x: PW - 40, y: H },
      { x: PW - 34, y: H },
      { x: PW, y: H - 120 },
      { x: PW, y: H - 128 },
    ],
    { color: NAVY_DEEP },
  );
  // thin gold inner edge
  page.drawLine({ start: { x: PW - 6, y: 0 }, end: { x: PW - 6, y: H - 130 }, thickness: 1.5, color: GOLD });

  // emblem
  page.drawCircle({ x: PW / 2, y: H - 38, size: 17, borderColor: GOLD, borderWidth: 1.6 });
  page.drawCircle({ x: PW / 2, y: H - 38, size: 12.5, borderColor: GOLD_LIGHT, borderWidth: 1 });
  centerText(page, mono, PW / 2, H - 44, f.serif, 13, GOLD_LIGHT);

  // LEARN PRACTICE GROW GET CERTIFIED
  const motto = ["LEARN", "PRACTICE", "GROW", "GET CERTIFIED"];
  motto.forEach((line, i) => {
    centerText(page, spaced(line), PW / 2, H - 78 - i * 17, f.helvBold, 9.5, WHITE);
  });

  // four feature rows
  const features: Array<{ icon: (p: PDFPage, x: number, y: number, s: number, c: RGB) => void; lines: [string, string] }> = [
    { icon: iconShield, lines: ["PRACTICAL", "LEARNING"] },
    { icon: iconMonitor, lines: ["EXPERT", "TRAINERS"] },
    { icon: iconChart, lines: ["INDUSTRY RELEVANT", "SKILLS"] },
    { icon: iconPeople, lines: ["BRIGHTER", "OPPORTUNITIES"] },
  ];
  features.forEach((feat, i) => {
    const y = H - 188 - i * 50;
    feat.icon(page, PW / 2, y + 12, 11, GOLD);
    centerText(page, feat.lines[0], PW / 2, y - 6, f.helvBold, 7, WHITE);
    centerText(page, feat.lines[1], PW / 2, y - 16, f.helvBold, 7, WHITE);
  });

  // script accent — clear of the last feature row (bottom label at y≈222)
  centerText(page, "Skills", PW / 2, 196, f.script, 23, GOLD_LIGHT);
  centerText(page, "Build", PW / 2, 171, f.script, 23, GOLD_LIGHT);
  centerText(page, "Better", PW / 2, 146, f.script, 23, GOLD_LIGHT);
  centerText(page, "Futures", PW / 2, 121, f.script, 23, GOLD_LIGHT);

  // campus photo in a gold frame (or a decorative pattern when none)
  const photo = await tryEmbedImage(doc, input.campusPhoto);
  const fx = 12, fy = 50, fw = PW - 24, fh = 64;
  page.drawRectangle({ x: fx - 3, y: fy - 3, width: fw + 6, height: fh + 6, color: GOLD_DARK });
  page.drawRectangle({ x: fx, y: fy, width: fw, height: fh, color: NAVY_SOFT });
  if (photo) {
    const scale = Math.max(fw / photo.width, fh / photo.height);
    const dw = photo.width * scale, dh = photo.height * scale;
    page.drawImage(photo, { x: fx + (fw - dw) / 2, y: fy + (fh - dh) / 2, width: dw, height: dh });
    // clip illusion: cover overflow with frame-coloured bars (simple crop guard)
    page.drawRectangle({ x: 0, y: fy + fh, width: PW, height: H - fy - fh, color: NAVY_DEEP });
    page.drawRectangle({ x: 0, y: 0, width: PW, height: fy, color: NAVY_DEEP });
    page.drawRectangle({ x: fx - 3, y: fy - 3, width: fw + 6, height: fh + 6, borderColor: GOLD_DARK, borderWidth: 3 });
  } else {
    // decorative diagonal gold pinstripes
    for (let i = 0; i < 9; i++) {
      page.drawLine({
        start: { x: fx + i * 16, y: fy },
        end: { x: fx + i * 16 + 34, y: fy + fh },
        thickness: 1,
        color: GOLD,
        opacity: 0.35,
      });
    }
    centerText(page, mono, PW / 2, fy + fh / 2 - 8, f.serif, 22, GOLD_LIGHT);
  }

  // small QR + trusted line at the panel bottom
  drawQrCode(page, input.verifyUrl, { x: 16, y: 16, size: 28, color: WHITE });
  const trusted = ["A TRUSTED NAME", "FOR A BRIGHTER TOMORROW"];
  trusted.forEach((line, i) => {
    page.drawText(line, { x: 52, y: 40 - i * 10, size: 6.5, font: f.helvBold, color: WHITE });
  });

  // =========================================================================
  // HEADER  (x 150 → 695)
  // =========================================================================
  const HX0 = PW, HX1 = 696;
  const hcx = (HX0 + HX1) / 2;

  // logo
  const logo = await tryEmbedImage(doc, input.logo);
  if (logo) {
    const ls = 66;
    const scale = Math.min(ls / logo.width, ls / logo.height);
    page.drawImage(logo, {
      x: HX0 + 22,
      y: H - 28 - logo.height * scale,
      width: logo.width * scale,
      height: logo.height * scale,
    });
  } else {
    // monogram medallion fallback
    page.drawCircle({ x: HX0 + 55, y: H - 62, size: 30, color: WHITE, borderColor: GOLD, borderWidth: 2 });
    centerText(page, mono, HX0 + 55, H - 72, f.serif, 24, NAVY);
  }

  // institute name — two lines like the reference: main words in navy
  // Playfair, last word in ORANGE letterspaced below it.
  const nameWords = input.instituteName.trim().split(/\s+/);
  const lastWord = nameWords.length > 1 ? (nameWords.pop() as string) : "";
  const firstPart = nameWords.join(" ");
  const nameSize = fitSize(f.serif, firstPart.toUpperCase(), HX1 - HX0 - 130, 30);
  centerText(page, firstPart.toUpperCase(), hcx + 20, H - 60, f.serif, nameSize, NAVY);
  let taglineY = H - 82;
  if (lastWord) {
    const lastSpaced = spaced(lastWord.toUpperCase());
    const lastSize = fitSize(f.serif, lastSpaced, 300, 19);
    centerText(page, lastSpaced, hcx + 20, H - 84, f.serif, lastSize, ORANGE);
    taglineY = H - 104;
  }

  // tagline in gold italic serif
  if (input.tagline) {
    const ts = fitSize(f.helvOblique, input.tagline, 330, 13);
    centerText(page, input.tagline, hcx + 20, taglineY, f.helvOblique, ts, GOLD_DARK);
  }

  // gold rules flanking the tagline zone
  const ruleY = taglineY - 12;
  page.drawLine({ start: { x: HX0 + 118, y: ruleY }, end: { x: hcx - 130, y: ruleY }, thickness: 1.2, color: GOLD });
  page.drawLine({ start: { x: hcx + 170, y: ruleY }, end: { x: HX1 - 14, y: ruleY }, thickness: 1.2, color: GOLD });

  // contact bar with tiny navy icons (envelope / pin / globe)
  const contactY = ruleY - 18;
  const drawMiniIcon = (kind: "mail" | "pin" | "globe", x: number, y: number) => {
    const c = NAVY_SOFT;
    if (kind === "mail") {
      page.drawRectangle({ x: x - 5, y: y - 1, width: 10, height: 7, borderColor: c, borderWidth: 1.1 });
      page.drawLine({ start: { x: x - 5, y: y + 6 }, end: { x, y: y + 1.5 }, thickness: 1.1, color: c });
      page.drawLine({ start: { x: x + 5, y: y + 6 }, end: { x, y: y + 1.5 }, thickness: 1.1, color: c });
    } else if (kind === "pin") {
      page.drawCircle({ x, y: y + 3, size: 3.4, borderColor: c, borderWidth: 1.1 });
      page.drawCircle({ x, y: y + 3, size: 1.2, color: c });
      poly(page, [{ x, y: y - 4 }, { x: x - 2.4, y: y + 0.5 }, { x: x + 2.4, y: y + 0.5 }], { color: c });
    } else {
      page.drawCircle({ x, y: y + 2.5, size: 4.2, borderColor: c, borderWidth: 1.1 });
      page.drawLine({ start: { x: x - 4.2, y: y + 2.5 }, end: { x: x + 4.2, y: y + 2.5 }, thickness: 0.9, color: c });
      page.drawLine({ start: { x, y: y - 1.7 }, end: { x, y: y + 6.7 }, thickness: 0.9, color: c });
    }
  };
  const segments: Array<{ icon: "mail" | "pin" | "globe"; text: string }> = [];
  if (input.contactEmail) segments.push({ icon: "mail", text: input.contactEmail });
  if (input.addressLine) segments.push({ icon: "pin", text: input.addressLine });
  if (input.motto) segments.push({ icon: "globe", text: input.motto });
  else if (input.website) segments.push({ icon: "globe", text: input.website });
  if (segments.length > 0) {
    const bs = 8.5;
    const gap = "   |   ";
    const gapW = f.helv.widthOfTextAtSize(gap, bs);
    const segWidths = segments.map((s) => 12 + f.helv.widthOfTextAtSize(s.text, bs));
    const totalW = segWidths.reduce((a, b) => a + b, 0) + gapW * (segments.length - 1);
    let sx = hcx - totalW / 2;
    segments.forEach((seg, i) => {
      drawMiniIcon(seg.icon, sx + 5, contactY);
      page.drawText(seg.text, { x: sx + 12, y: contactY, size: bs, font: f.helv, color: GRAY_DARK });
      sx += (segWidths[i] as number) + gapW;
      if (i < segments.length - 1) {
        page.drawText("|", { x: sx - gapW + f.helv.widthOfTextAtSize(" ", bs) * 1.5, y: contactY, size: bs, font: f.helv, color: GRAY });
      }
    });
  }

  // =========================================================================
  // TITLE BLOCK
  // =========================================================================
  const titleY = H - 188;
  const certSize = 54;
  centerText(page, "CERTIFICATE", hcx, titleY, f.serif, certSize, NAVY);
  // OF COMPLETION with flourishes
  const ocY = titleY - 30;
  const ocText = spaced("OF COMPLETION");
  const ocSize = 16;
  const ocW = f.helvBold.widthOfTextAtSize(ocText, ocSize);
  centerText(page, ocText, hcx, ocY, f.helvBold, ocSize, GOLD_DARK);
  // small diamond flourishes flanking the subtitle
  for (const s of [-1, 1]) {
    const fx0 = hcx + s * (ocW / 2 + 24);
    const d = 4.5;
    poly(
      page,
      [
        { x: fx0, y: ocY + 6 + d },
        { x: fx0 + d, y: ocY + 6 },
        { x: fx0, y: ocY + 6 - d },
        { x: fx0 - d, y: ocY + 6 },
      ],
      { color: GOLD },
    );
  }
  centerText(page, spaced("THIS IS TO CERTIFY THAT"), hcx, ocY - 26, f.helv, 8.5, GRAY);

  // =========================================================================
  // STUDENT + COURSE
  // =========================================================================
  const nameSize2 = fitSize(f.script, input.studentName, 430, 50);
  centerText(page, input.studentName, hcx, ocY - 74, f.script, nameSize2, NAVY);
  goldRule(page, hcx, ocY - 88, 150);

  centerText(page, "has successfully completed the", hcx, ocY - 108, f.helvOblique, 11, GRAY);
  const courseSize = fitSize(f.serif, input.courseName, 440, 19);
  centerText(page, input.courseName, hcx, ocY - 132, f.serif, courseSize, NAVY);
  centerText(page, "with dedication and satisfactory performance.", hcx, ocY - 150, f.helvOblique, 10, GRAY);
  centerText(
    page,
    "We appreciate your commitment to learning and wish you continued",
    hcx, ocY - 168, f.helv, 8.5, GRAY,
  );
  centerText(page, "success in your future endeavours.", hcx, ocY - 180, f.helv, 8.5, GRAY);

  // lotus + "Learn Today / Lead Tomorrow" (left of the course block)
  drawLotus(page, HX0 + 78, ocY - 128, 13, GOLD);
  centerText(page, "Learn Today", HX0 + 78, ocY - 152, f.helv, 8, GRAY_DARK);
  centerText(page, "Lead Tomorrow", HX0 + 78, ocY - 163, f.helvBold, 8, GRAY_DARK);

  // =========================================================================
  // INFO STRIP — CERTIFICATE ID | ISSUE DATE | MODE | GRADE
  // =========================================================================
  const stripY = 148;
  const cells: Array<[string, string]> = [
    ["CERTIFICATE ID", input.code],
    ["ISSUE DATE", formatCertDate(input.issuedAt)],
    ["MODE", input.mode || "—"],
    ["GRADE", input.grade || "—"],
  ];
  const colW = 118;
  const stripW = colW * cells.length;
  const sx0 = hcx - stripW / 2;
  cells.forEach(([label, value], i) => {
    const cx = sx0 + colW * i + colW / 2;
    centerText(page, label, cx, stripY + 16, f.helv, 7, GRAY);
    const vs = fitSize(f.helvBold, value, colW - 14, 10.5);
    centerText(page, value, cx, stripY, f.helvBold, vs, NAVY);
    if (i > 0) {
      page.drawLine({
        start: { x: sx0 + colW * i, y: stripY - 6 },
        end: { x: sx0 + colW * i, y: stripY + 24 },
        thickness: 1.2,
        color: GOLD,
      });
    }
  });

  // =========================================================================
  // RIGHT COLUMN  (x 696 → 842)
  // =========================================================================
  const RX0 = 700, RX1 = W;
  const rcx = (RX0 + RX1) / 2;

  centerText(page, "EDUCATION", rcx, H - 40, f.helvBold, 8.5, NAVY);
  centerText(page, "BEYOND", rcx, H - 53, f.helvBold, 8.5, NAVY);
  centerText(page, "BOUNDARIES", rcx, H - 66, f.helvBold, 8.5, NAVY);

  // Hindi tagline (embedded Devanagari font — always renders)
  centerText(page, "सीखो", rcx, H - 92, f.deva, 13, NAVY);
  centerText(page, "बढ़ो", rcx, H - 110, f.deva, 13, NAVY);
  centerText(page, "सफल बनो", rcx, H - 128, f.deva, 13, NAVY);
  page.drawLine({ start: { x: rcx - 30, y: H - 134 }, end: { x: rcx - 6, y: H - 134 }, thickness: 2, color: ORANGE });
  page.drawLine({ start: { x: rcx + 6, y: H - 134 }, end: { x: rcx + 30, y: H - 134 }, thickness: 2, color: GREEN });

  centerText(page, "SKILLED", rcx - 18, H - 152, f.helv, 7, GRAY);
  centerText(page, "INDIA", rcx - 18, H - 163, f.helv, 7, GRAY);
  centerText(page, "STRONGER", rcx - 18, H - 174, f.helv, 7, GRAY);
  centerText(page, "INDIA", rcx - 18, H - 185, f.helv, 7, GRAY);
  drawIndiaMap(page, rcx + 32, H - 170, 34, 40, NAVY_SOFT);

  // medal with ribbon
  const medY = H - 252;
  const medR = 38;
  page.drawCircle({ x: rcx, y: medY, size: medR, color: GOLD });
  page.drawCircle({ x: rcx, y: medY, size: medR - 3, color: GOLD_LIGHT });
  page.drawCircle({ x: rcx, y: medY, size: medR - 6, color: NAVY });
  const medName = input.instituteName.length > 22 ? input.instituteName.slice(0, 22) : input.instituteName;
  const medNameSize = fitSize(f.helvBold, medName.toUpperCase(), medR * 1.05, 5.5);
  centerText(page, medName.toUpperCase(), rcx, medY + medR * 0.45, f.helvBold, medNameSize, WHITE);
  page.drawCircle({ x: rcx, y: medY - 2, size: medR * 0.42, color: GOLD });
  centerText(page, mono, rcx, medY - 12, f.serif, 20, NAVY);
  centerText(page, "LEARN • PRACTICE • GROWTH", rcx, medY - medR * 0.62, f.helvBold, 4.8, GOLD_LIGHT);
  // ribbon
  const ribTop = medY - medR + 2;
  poly(page, [
      { x: rcx - 20, y: ribTop },
      { x: rcx + 20, y: ribTop },
      { x: rcx + 20, y: ribTop - 52 },
      { x: rcx, y: ribTop - 40 },
      { x: rcx - 20, y: ribTop - 52 },
    ], { color: NAVY },
  );
  page.drawLine({ start: { x: rcx - 20, y: ribTop }, end: { x: rcx - 20, y: ribTop - 52 }, thickness: 1.5, color: GOLD });
  page.drawLine({ start: { x: rcx + 20, y: ribTop }, end: { x: rcx + 20, y: ribTop - 52 }, thickness: 1.5, color: GOLD });

  centerText(page, "KNOWLEDGE", rcx, ribTop - 66, f.helv, 7, GRAY);
  centerText(page, "TODAY", rcx, ribTop - 78, f.helv, 7, GRAY);
  centerText(page, "A BETTER", rcx, ribTop - 90, f.helv, 7, GRAY);
  centerText(page, "TOMORROW", rcx, ribTop - 102, f.helv, 7, GRAY);

  // QR block
  const qSize = 68;
  const qx = rcx - qSize / 2, qy = 172;
  page.drawRectangle({ x: qx - 5, y: qy - 5, width: qSize + 10, height: qSize + 10, color: WHITE, borderColor: GOLD, borderWidth: 1 });
  drawQrCode(page, input.verifyUrl, { x: qx, y: qy, size: qSize, color: NAVY });
  centerText(page, "SCAN TO VERIFY", rcx, qy - 16, f.helvBold, 8, NAVY);
  centerText(page, "Verify this certificate at", rcx, qy - 28, f.helv, 6.5, GRAY);
  if (input.website) {
    const ws2 = fitSize(f.helv, input.website, 110, 6.5);
    centerText(page, input.website, rcx, qy - 38, f.helv, ws2, GRAY_DARK);
  }

  // hologram-style stamp
  const hgY = 102, hgH = 26, hgW = 88;
  page.drawRectangle({ x: rcx - hgW / 2, y: hgY, width: hgW, height: hgH, color: WHITE, borderColor: GOLD, borderWidth: 1 });
  for (let i = 0; i < 7; i++) {
    page.drawLine({
      start: { x: rcx - hgW / 2 + 6 + i * 12, y: hgY + 4 },
      end: { x: rcx - hgW / 2 + 13 + i * 12, y: hgY + hgH - 4 },
      thickness: 0.8,
      color: GOLD,
      opacity: 0.6,
    });
  }
  const hgCodeSize = fitSize(f.helvBold, input.code, hgW - 12, 6);
  centerText(page, input.code, rcx, hgY + 11, f.helvBold, hgCodeSize, NAVY_SOFT);

  // vertical edge text
  page.drawText(spaced("SKILLS FOR A BRIGHTER TOMORROW"), {
    x: W - 14,
    y: 120,
    size: 7.5,
    font: f.helvBold,
    color: GOLD_DARK,
    rotate: degrees(-90),
  });

  // =========================================================================
  // SIGNATURES + SEAL  (x 150 → 696, y 48 → 148)
  // =========================================================================
  const sigY = 108;
  const drawSignatureBlock = async (
    cx: number,
    name: string | null | undefined,
    title: string,
    sigImage: CertificateImage | null | undefined,
  ) => {
    const sig = await tryEmbedImage(doc, sigImage);
    if (sig) {
      const sw = 120;
      const sh = (sig.height / sig.width) * sw;
      page.drawImage(sig, { x: cx - sw / 2, y: sigY + 6, width: sw, height: Math.min(sh, 44) });
    } else if (name) {
      const ss = fitSize(f.script, name, 150, 26);
      centerText(page, name, cx, sigY + 8, f.script, ss, NAVY_SOFT);
    }
    page.drawLine({ start: { x: cx - 80, y: sigY }, end: { x: cx + 80, y: sigY }, thickness: 1, color: NAVY_SOFT });
    if (name) centerText(page, name, cx, sigY - 18, f.helvBold, 10, GRAY_DARK);
    centerText(page, title, cx, sigY - 32, f.helv, 8, GRAY);
    const instShort = input.instituteName.length > 30 ? input.instituteName.slice(0, 30) : input.instituteName;
    centerText(page, instShort, cx, sigY - 44, f.helv, 7.5, GRAY);
  };

  await drawSignatureBlock(HX0 + 108, input.centreHeadName, "Centre Head", input.centreHeadSignature);
  drawSeal(page, f, hcx, 96, 34, input.instituteName, input.establishedYear ?? null);
  await drawSignatureBlock(HX1 - 108, input.authorityName, "Authority", input.authoritySignature);

  // =========================================================================
  // BOTTOM NAVY STRIP — inside the outer frame (y 7 → 29)
  // =========================================================================
  page.drawRectangle({ x: 0, y: 7, width: W, height: 22, color: NAVY_DEEP });
  page.drawLine({ start: { x: 0, y: 29 }, end: { x: 700, y: 29 }, thickness: 1.5, color: GOLD });
  const stripCols: Array<{ icon: (p: PDFPage, x: number, y: number, s: number, c: RGB) => void; lines: [string, string] }> = [
    { icon: iconCap, lines: ["COMPUTER EDUCATION", "SKILL DEVELOPMENT"] },
    { icon: iconGear, lines: ["CAREER OPPORTUNITIES", "BRIGHTER FUTURE"] },
    { icon: iconPeople, lines: ["STUDENTS TODAY", "LEADERS TOMORROW"] },
  ];
  stripCols.forEach((col, i) => {
    const cx = W * (0.18 + i * 0.24);
    col.icon(page, cx - 108, 18, 7, GOLD);
    page.drawText(col.lines[0], { x: cx - 96, y: 20, size: 7, font: f.helvBold, color: WHITE });
    page.drawText(col.lines[1], { x: cx - 96, y: 12, size: 7, font: f.helv, color: GOLD_LIGHT });
  });

  // navy wave sweeping up from the bottom-right (reference design) —
  // the gold script above sits on it. SVG coords: y negated.
  page.drawSvgPath(
    "M 700 -7 L 842 -7 L 842 -100 C 815 -92, 790 -84, 765 -72 C 740 -60, 720 -29, 700 -29 Z",
    { x: 0, y: 0, color: NAVY_DEEP },
  );
  page.drawSvgPath(
    "M 842 -100 C 815 -92, 790 -84, 765 -72 C 740 -60, 720 -29, 700 -29",
    { x: 0, y: 0, borderColor: GOLD, borderWidth: 2 },
  );

  // "Education is an Investment in Yourself" — gold script ON the navy wave
  centerText(page, "Education", 758, 58, f.script, 13, GOLD_LIGHT);
  centerText(page, "is an Investment", 758, 42, f.script, 13, GOLD_LIGHT);
  centerText(page, "in Yourself", 758, 26, f.script, 13, GOLD_LIGHT);

  // ---- outer gold frame -----------------------------------------------
  const m = 7;
  page.drawRectangle({ x: m, y: m, width: W - m * 2, height: H - m * 2, borderColor: GOLD, borderWidth: 2 });
  page.drawRectangle({ x: m + 5, y: m + 5, width: W - (m + 5) * 2, height: H - (m + 5) * 2, borderColor: GOLD_DARK, borderWidth: 0.8 });
  // corner ornaments — gold diamonds seated on the frame corners
  const cd = 6;
  for (const [ccx, ccy] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]] as Array<[number, number]>) {
    poly(
      page,
      [
        { x: ccx, y: ccy + cd },
        { x: ccx + cd, y: ccy },
        { x: ccx, y: ccy - cd },
        { x: ccx - cd, y: ccy },
      ],
      { color: GOLD },
    );
  }


  if (watermark) drawPreviewWatermark(page, f, W, H);
}
