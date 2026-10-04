// src/server/invoices/generate-invoice.ts
//
// Generates a professional invoice PDF (pdf-lib) for a student's
// registration fee payment. Uses only built-in Helvetica fonts — no
// external font files needed.
//
// The invoice is issued at payment time and emailed to the student;
// the PDF bytes are also returned so the API route can persist them.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { BRAND } from "@/config/brand";

export interface InvoicePdfInput {
  invoiceNumber: string;
  issuedAt: Date;
  studentName: string;
  studentEmail?: string | null;
  studentCode: string;
  instituteName: string;
  instituteAddress?: string | null;
  amountPaise: number;
  paymentRef: string;
}

function formatINR(paise: number): string {
  return `Rs. ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Amount in words for Indian numbering (crore/lakh/thousand). Paise ignored beyond 2dp. */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  if (rupees === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n] as string;
    return (tens[Math.floor(n / 10)] as string) + (n % 10 ? " " + (ones[n % 10] as string) : "");
  };
  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return (h ? (ones[h] as string) + " Hundred" + (rest ? " " : "") : "") + (rest ? twoDigits(rest) : "");
  };
  let n = rupees;
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (n) parts.push(threeDigits(n));
  return parts.join(" ") + " Rupees Only";
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width } = page.getSize();

  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.13, 0.16, 0.23);
  const muted = rgb(0.42, 0.45, 0.52);
  const accent = rgb(0.16, 0.32, 0.72);
  const line = rgb(0.88, 0.89, 0.91);

  let y = 792;

  // Header — brand + INVOICE title
  page.drawText(BRAND.name, { x: 48, y, size: 22, font: helvBold, color: accent });
  y -= 20;
  page.drawText("Student Registration Fee — Invoice", { x: 48, y, size: 10, font: helv, color: muted });
  page.drawText("INVOICE", { x: width - 48 - helvBold.widthOfTextAtSize("INVOICE", 22), y: y + 20, size: 22, font: helvBold, color: ink });

  y -= 28;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: line });
  y -= 22;

  // Meta row: invoice no / date / payment ref
  const meta: [string, string][] = [
    ["Invoice No.", input.invoiceNumber],
    ["Date", formatDate(input.issuedAt)],
    ["Payment Ref", input.paymentRef],
  ];
  for (const [label, value] of meta) {
    page.drawText(label + ":", { x: 48, y, size: 9, font: helvBold, color: muted });
    page.drawText(value, { x: 140, y, size: 9, font: helv, color: ink });
    y -= 15;
  }

  y -= 10;
  // Billed to
  page.drawText("Billed To", { x: 48, y, size: 10, font: helvBold, color: ink });
  y -= 16;
  page.drawText(input.studentName, { x: 48, y, size: 11, font: helvBold, color: ink });
  y -= 15;
  page.drawText(`Student Code: ${input.studentCode}`, { x: 48, y, size: 9, font: helv, color: muted });
  y -= 14;
  if (input.studentEmail) {
    page.drawText(input.studentEmail, { x: 48, y, size: 9, font: helv, color: muted });
    y -= 14;
  }
  page.drawText(input.instituteName, { x: 48, y, size: 9, font: helv, color: muted });
  y -= 14;
  if (input.instituteAddress) {
    page.drawText(input.instituteAddress, { x: 48, y, size: 9, font: helv, color: muted });
    y -= 14;
  }

  y -= 18;
  // Line items table
  const tableTop = y;
  page.drawRectangle({ x: 48, y: y - 26, width: width - 96, height: 26, color: rgb(0.95, 0.96, 0.98) });
  page.drawText("Description", { x: 58, y: y - 18, size: 9, font: helvBold, color: ink });
  page.drawText("Amount", { x: width - 48 - helvBold.widthOfTextAtSize("Amount", 9) - 10, y: y - 18, size: 9, font: helvBold, color: ink });
  y -= 26;

  page.drawText("Student Registration Fee (one-time)", { x: 58, y: y - 18, size: 10, font: helv, color: ink });
  const amountStr = formatINR(input.amountPaise);
  page.drawText(amountStr, { x: width - 48 - helv.widthOfTextAtSize(amountStr, 10) - 10, y: y - 18, size: 10, font: helv, color: ink });
  y -= 30;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: line });
  y -= 22;

  // Total
  page.drawText("Total Paid", { x: 58, y, size: 11, font: helvBold, color: ink });
  page.drawText(amountStr, { x: width - 48 - helvBold.widthOfTextAtSize(amountStr, 12) - 10, y, size: 12, font: helvBold, color: accent });
  y -= 20;
  page.drawText(`Amount in words: ${amountInWords(input.amountPaise)}`, { x: 48, y, size: 8, font: helv, color: muted });

  y -= 40;
  page.drawText("Status: PAID", { x: 48, y, size: 10, font: helvBold, color: rgb(0.1, 0.5, 0.25) });
  y -= 30;

  // Footer
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: line });
  y -= 18;
  page.drawText(
    "This is a computer-generated invoice. Your certificate download will be activated after institute approval.",
    { x: 48, y, size: 8, font: helv, color: muted, maxWidth: width - 96 }
  );

  // Keep the table top marker referenced (avoids unused-var lint if refactored later)
  void tableTop;

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
