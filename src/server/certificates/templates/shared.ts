// src/server/certificates/templates/shared.ts
//
// Shared drawing primitives for all certificate templates.
// Every helper takes explicit coordinates — templates compose them
// into distinct layouts.
import { rgb, degrees, type PDFPage, type PDFFont, type RGB, type PDFDocument } from "pdf-lib";
import { generateQrMatrix } from "@/lib/qrcode";
import type { CertificatePdfInput } from "../generate-pdf";
import { monogramOf } from "./types";

// ---------------------------------------------------------------- palette
export const NAVY = rgb(0.043, 0.11, 0.255);
export const NAVY_DEEP = rgb(0.027, 0.075, 0.19);
export const NAVY_SOFT = rgb(0.1, 0.18, 0.36);
export const GOLD = rgb(0.788, 0.635, 0.153);
export const GOLD_LIGHT = rgb(0.918, 0.776, 0.31);
export const GOLD_DARK = rgb(0.573, 0.447, 0.098);
export const ORANGE = rgb(0.878, 0.478, 0.22);
export const GREEN = rgb(0.18, 0.55, 0.27);
export const GRAY = rgb(0.42, 0.44, 0.48);
export const GRAY_DARK = rgb(0.23, 0.25, 0.29);
export const WHITE = rgb(1, 1, 1);
export const CREAM = rgb(0.995, 0.985, 0.955);

// ---------------------------------------------------------------- text
/** Letterspaced text (ASCII space — WinAnsi-safe). */
export function spaced(text: string): string {
  return text.split("").join(" ");
}

export function fitSize(font: PDFFont, text: string, maxWidth: number, start: number, min = 8): number {
  let size = start;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

export function centerText(
  page: PDFPage,
  text: string,
  cx: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

/** Gold divider line with a centre diamond. */
export function goldRule(page: PDFPage, cx: number, y: number, halfWidth: number, color: RGB = GOLD) {
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

/**
 * Filled/stroked polygon via drawSvgPath (pdf-lib has no drawPolygon).
 * drawSvgPath flips Y, so points are expressed relative to the first
 * point with negated Y deltas.
 */
export function poly(
  page: PDFPage,
  points: Array<{ x: number; y: number }>,
  opts: { color?: RGB; borderColor?: RGB; borderWidth?: number; opacity?: number } = {},
) {
  if (points.length < 3) return;
  const [p0, ...rest] = points as [{ x: number; y: number }, ...Array<{ x: number; y: number }>];
  const d = "M 0 0 " + rest.map((pt) => `L ${pt.x - p0.x} ${-(pt.y - p0.y)}`).join(" ") + " Z";
  page.drawSvgPath(d, {
    x: p0.x,
    y: p0.y,
    color: opts.color,
    borderColor: opts.borderColor,
    borderWidth: opts.borderWidth,
    opacity: opts.opacity,
  });
}

// ---------------------------------------------------------------- images / qr
export interface EmbeddedImage {
  bytes: Buffer;
  mimeType: string;
}

export async function tryEmbedImage(doc: PDFDocument, image: EmbeddedImage | null | undefined) {
  if (!image || image.bytes.length === 0) return null;
  const attempts =
    image.mimeType === "image/png"
      ? [() => doc.embedPng(image.bytes), () => doc.embedJpg(image.bytes)]
      : [() => doc.embedJpg(image.bytes), () => doc.embedPng(image.bytes)];
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch {
      // try the next format
    }
  }
  return null;
}

export function drawQrCode(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; color: RGB },
) {
  const matrix = generateQrMatrix(text, "M");
  const moduleSize = opts.size / matrix.size;
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.isDark(row, col)) {
        page.drawRectangle({
          x: opts.x + col * moduleSize,
          y: opts.y + (matrix.size - 1 - row) * moduleSize,
          width: moduleSize,
          height: moduleSize,
          color: opts.color,
        });
      }
    }
  }
}

// ---------------------------------------------------------------- seal
/** Gold seal: concentric rings, institute name, monogram, ESTD year. */
export function drawSeal(
  page: PDFPage,
  f: { serif: PDFFont; helv: PDFFont; helvBold: PDFFont },
  cx: number,
  cy: number,
  r: number,
  instituteName: string,
  establishedYear: number | null,
  opts: { ring?: RGB; band?: RGB; face?: RGB; text?: RGB } = {},
) {
  const ring = opts.ring ?? GOLD;
  const band = opts.band ?? NAVY;
  const face = opts.face ?? GOLD;
  const text = opts.text ?? WHITE;
  page.drawCircle({ x: cx, y: cy, size: r, color: ring });
  page.drawCircle({ x: cx, y: cy, size: r - 3, color: GOLD_LIGHT });
  page.drawCircle({ x: cx, y: cy, size: r - 5, color: band });
  const bandSize = Math.max(5, r * 0.17);
  const shortName = instituteName.length > 22 ? instituteName.slice(0, 22) : instituteName;
  const nameFit = fitSize(f.helvBold, shortName.toUpperCase(), r * 1.15, bandSize);
  centerText(page, shortName.toUpperCase(), cx, cy + r * 0.44, f.helvBold, nameFit, text);
  centerText(page, "LEARN • PRACTICE • GROW", cx, cy - r * 0.62, f.helvBold, bandSize * 0.82, GOLD_LIGHT);
  page.drawCircle({ x: cx, y: cy, size: r * 0.52, color: face });
  page.drawCircle({ x: cx, y: cy, size: r * 0.52 - 2.5, borderColor: band, borderWidth: 1.2 });
  const mono = monogramOf(instituteName);
  const ms = fitSize(f.serif, mono, r * 0.72, r * 0.52);
  centerText(page, mono, cx, cy - ms * 0.32, f.serif, ms, band);
  if (establishedYear) {
    centerText(page, `ESTD. ${establishedYear}`, cx, cy - r * 0.34, f.helvBold, bandSize * 0.78, text);
  }
  for (const sx of [-1, 1]) {
    const ss = bandSize;
    page.drawText("•", { x: cx + sx * r * 0.62 - ss * 0.32, y: cy - ss * 0.32, size: ss, font: f.helv, color: GOLD_LIGHT });
  }
}

// ---------------------------------------------------------------- watermark
/** Full-page diagonal watermark for locked-template previews. */
export function drawPreviewWatermark(
  page: PDFPage,
  f: { helvBold: PDFFont },
  W: number,
  H: number,
) {
  const cx = W / 2, cy = H / 2;
  for (const [text, size, dy, opacity] of [
    ["PREVIEW", 96, 30, 0.1],
    ["CERTIVO", 40, -60, 0.08],
  ] as Array<[string, number, number, number]>) {
    const w = f.helvBold.widthOfTextAtSize(spaced(text), size);
    page.drawText(spaced(text), {
      x: cx - w / 2,
      y: cy + dy,
      size,
      font: f.helvBold,
      color: rgb(0.5, 0.1, 0.1),
      opacity,
      rotate: degrees(-24),
    });
  }
}

// ---------------------------------------------------------------- icons
function iconBase(draw: (page: PDFPage, cx: number, y: number, s: number, color: RGB) => void) {
  return draw;
}

export const iconShield = iconBase((page, cx, y, s, color) => {
  poly(
    page,
    [
      { x: cx, y: y + s },
      { x: cx + s * 0.85, y: y + s * 0.55 },
      { x: cx + s * 0.85, y: y - s * 0.2 },
      { x: cx, y: y - s },
      { x: cx - s * 0.85, y: y - s * 0.2 },
      { x: cx - s * 0.85, y: y + s * 0.55 },
    ],
    { borderColor: color, borderWidth: 1.4 },
  );
});

export const iconCap = iconBase((page, cx, y, s, color) => {
  poly(
    page,
    [
      { x: cx - s, y },
      { x: cx, y: y + s * 0.55 },
      { x: cx + s, y },
      { x: cx, y: y - s * 0.55 },
    ],
    { borderColor: color, borderWidth: 1.4 },
  );
  page.drawLine({ start: { x: cx + s, y }, end: { x: cx + s, y: y - s * 0.9 }, thickness: 1.2, color });
  page.drawCircle({ x: cx + s, y: y - s * 1.05, size: s * 0.16, color });
});

/** Stylised lotus: five petals fanning out. */
export function drawLotus(page: PDFPage, cx: number, y: number, s: number, color: RGB) {
  const petal = (angleDeg: number, len: number, wid: number) => {
    const a = (angleDeg * Math.PI) / 180;
    const tipX = cx + Math.cos(a) * len;
    const tipY = y + Math.sin(a) * len;
    const px = -Math.sin(a);
    const py = Math.cos(a);
    poly(
      page,
      [
        { x: cx + px * wid * 0.4, y: y + py * wid * 0.4 },
        { x: tipX, y: tipY },
        { x: cx - px * wid * 0.4, y: y - py * wid * 0.4 },
      ],
      { color, opacity: 0.55 },
    );
  };
  petal(90, s * 1.5, s * 0.5);
  petal(55, s * 1.25, s * 0.5);
  petal(125, s * 1.25, s * 0.5);
  petal(25, s * 0.95, s * 0.5);
  petal(155, s * 0.95, s * 0.5);
  page.drawLine({ start: { x: cx - s * 1.1, y: y - s * 0.35 }, end: { x: cx + s * 1.1, y: y - s * 0.35 }, thickness: 1.2, color });
}

/** Dotted India outline — simplified polygon, drawn as light dots. */
export function drawIndiaMap(page: PDFPage, cx: number, cy: number, w: number, h: number, color: RGB) {
  const outline: Array<[number, number]> = [
    [0.46, 1.0], [0.55, 0.94], [0.6, 0.86], [0.57, 0.78], [0.62, 0.72],
    [0.72, 0.7], [0.82, 0.64], [0.88, 0.56], [0.82, 0.5], [0.74, 0.46],
    [0.7, 0.36], [0.62, 0.26], [0.56, 0.14], [0.51, 0.02], [0.47, 0.14],
    [0.4, 0.26], [0.32, 0.36], [0.22, 0.44], [0.14, 0.54], [0.18, 0.64],
    [0.28, 0.7], [0.36, 0.78], [0.4, 0.88],
  ];
  for (let i = 0; i < outline.length; i++) {
    const [x1, y1] = outline[i] as [number, number];
    const [x2, y2] = outline[(i + 1) % outline.length] as [number, number];
    const dx = (x2 - x1) * w, dy = (y2 - y1) * h;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.round(dist / 3.2));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      page.drawCircle({
        x: cx - w / 2 + (x1 + (x2 - x1) * t) * w,
        y: cy - h / 2 + (y1 + (y2 - y1) * t) * h,
        size: 0.9,
        color,
        opacity: 0.55,
      });
    }
  }
}

export type { CertificatePdfInput };
