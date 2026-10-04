// tests/template-render.test.ts
//
// Every template renders a valid one-page PDF, with and without the
// preview watermark. Guards against a template throwing on missing
// optional branding (the sample input has no logo/signatures).
import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateCertificatePdf } from "../src/server/certificates/generate-pdf";
import { TEMPLATE_CATALOG } from "../src/server/certificates/templates/registry";

const SAMPLE = {
  code: "CERTIVO-TEST-0001",
  studentName: "Test Student",
  instituteName: "Test Institute",
  courseName: "Test Course",
  completionDate: new Date("2026-01-15"),
  issuedAt: new Date("2026-10-04"),
  verifyUrl: "https://example.com/v/CERTIVO-TEST-0001",
  grade: "A",
  mode: "Online",
};

describe.each(TEMPLATE_CATALOG.map((t) => [t.id, t.name] as [string, string]))(
  "template %s (%s)",
  (id) => {
    it("renders a valid single-page PDF", async () => {
      const bytes = await generateCertificatePdf(SAMPLE, { templateId: id });
      expect(bytes.length).toBeGreaterThan(1000);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
    }, 30000);

    it("renders with watermark without throwing", async () => {
      const bytes = await generateCertificatePdf(SAMPLE, { templateId: id, watermark: true });
      expect(bytes.length).toBeGreaterThan(1000);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
    }, 30000);
  },
);

describe("template fallback", () => {
  it("unknown template id falls back to the free template", async () => {
    const bytes = await generateCertificatePdf(SAMPLE, { templateId: "does-not-exist" });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  }, 30000);
});
