// tests/white-label.test.ts
//
// White-label branding: base-domain derivation from APP_URL (pure logic).
// DB-backed tenant matching (findWhiteLabelTenant) is covered by
// integration tests; the hostname parsing rules are asserted here.
import { describe, it, expect, afterEach } from "vitest";
import { getBaseDomain } from "../src/server/branding/resolve-branding";

describe("getBaseDomain", () => {
  const OLD = process.env.APP_URL;
  afterEach(() => {
    if (OLD === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = OLD;
  });

  it("extracts the hostname from APP_URL", () => {
    process.env.APP_URL = "https://certivo-chandan21.vercel.app";
    expect(getBaseDomain()).toBe("certivo-chandan21.vercel.app");
  });

  it("lowercases and strips ports", () => {
    process.env.APP_URL = "https://Example.COM:3000/path";
    expect(getBaseDomain()).toBe("example.com");
  });

  it("returns null when APP_URL is unset", () => {
    delete process.env.APP_URL;
    expect(getBaseDomain()).toBeNull();
  });

  it("returns null for a malformed APP_URL", () => {
    process.env.APP_URL = "not a url";
    expect(getBaseDomain()).toBeNull();
  });
});
