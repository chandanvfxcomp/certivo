// tests/leads.test.ts
//
// Lead follow-up template rendering + visit tracker path filtering.
// (DB-backed lead creation is covered by integration tests.)
import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/server/leads/templates";
import { shouldTrack } from "../src/server/visits/tracker";

describe("renderTemplate", () => {
  it("replaces {{name}}, {{institute}}, {{email}}", () => {
    const out = renderTemplate("Hi {{name}} from {{institute}} ({{email}})", {
      name: "Raj",
      institute: "ABC Academy",
      email: "raj@abc.in",
    });
    expect(out).toBe("Hi Raj from ABC Academy (raj@abc.in)");
  });

  it("falls back gracefully when institute is missing", () => {
    const out = renderTemplate("Hello {{name}}, welcome to {{institute}}", { name: "Raj" });
    expect(out).toBe("Hello Raj, welcome to your institute");
  });

  it("handles extra whitespace in placeholders", () => {
    const out = renderTemplate("Hi {{ name }}", { name: "Raj" });
    expect(out).toBe("Hi Raj");
  });
});

describe("shouldTrack", () => {
  it("tracks public pages", () => {
    expect(shouldTrack("/")).toBe(true);
    expect(shouldTrack("/directory")).toBe(true);
    expect(shouldTrack("/v/ABC123")).toBe(true);
  });

  it("ignores admin/api/app pages", () => {
    expect(shouldTrack("/admin/dashboard")).toBe(false);
    expect(shouldTrack("/api/leads")).toBe(false);
    expect(shouldTrack("/super-admin/dashboard")).toBe(false);
  });
});
