// tests/template-registry.test.ts
//
// Template catalog invariants: 10 templates, 1 free, 9 premium,
// every id has a renderer, prices sane.
import { describe, it, expect } from "vitest";
import {
  TEMPLATE_CATALOG,
  FREE_TEMPLATE_ID,
  DEFAULT_TEMPLATE_ID,
  getTemplateMeta,
  isTemplateId,
} from "../src/server/certificates/templates/registry";
import { TEMPLATE_RENDERERS, getTemplateRenderer } from "../src/server/certificates/templates";

describe("template catalog", () => {
  it("has exactly 10 templates", () => {
    expect(TEMPLATE_CATALOG).toHaveLength(10);
  });

  it("has exactly 1 free template", () => {
    const free = TEMPLATE_CATALOG.filter((t) => t.tier === "free");
    expect(free).toHaveLength(1);
    expect(free[0]!.id).toBe(FREE_TEMPLATE_ID);
    expect(free[0]!.pricePaise).toBe(0);
  });

  it("has 9 premium templates with positive prices", () => {
    const premium = TEMPLATE_CATALOG.filter((t) => t.tier === "premium");
    expect(premium).toHaveLength(9);
    for (const t of premium) {
      expect(t.pricePaise).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    const ids = TEMPLATE_CATALOG.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("default template is the free one", () => {
    expect(DEFAULT_TEMPLATE_ID).toBe(FREE_TEMPLATE_ID);
  });

  it("every catalog id has a renderer, and unknown ids fall back", () => {
    for (const t of TEMPLATE_CATALOG) {
      expect(TEMPLATE_RENDERERS[t.id]).toBeTypeOf("function");
      expect(isTemplateId(t.id)).toBe(true);
    }
    expect(isTemplateId("nope")).toBe(false);
    expect(getTemplateMeta("nope").id).toBe(FREE_TEMPLATE_ID);
    expect(getTemplateRenderer("nope")).toBe(TEMPLATE_RENDERERS[FREE_TEMPLATE_ID]);
  });
});
