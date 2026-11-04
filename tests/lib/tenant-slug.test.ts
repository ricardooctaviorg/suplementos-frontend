import { describe, expect, it } from "vitest";
import { isValidTenantSlug, normalizeTenantSlug } from "@/lib/tenant-slug";

describe("normalizeTenantSlug", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeTenantSlug("  Mi-Tienda  ")).toBe("mi-tienda");
  });
});

describe("isValidTenantSlug", () => {
  it.each(["abc", "mi-tienda", "tienda-24", "a1-b2-c3", "a".repeat(40)])("accepts %s", (slug) => {
    expect(isValidTenantSlug(slug)).toBe(true);
  });

  it.each([
    ["too short", "ab"],
    ["too long", "a".repeat(41)],
    ["uppercase", "Tienda"],
    ["leading hyphen", "-tienda"],
    ["trailing hyphen", "tienda-"],
    ["double hyphen", "mi--tienda"],
    ["spaces", "mi tienda"],
    ["accents", "tiend\u00e1"],
    ["path characters", "../admin"],
    ["empty", ""],
  ])("rejects %s", (_reason, slug) => {
    expect(isValidTenantSlug(slug)).toBe(false);
  });
});
