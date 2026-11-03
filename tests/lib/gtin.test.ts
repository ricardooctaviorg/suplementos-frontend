import { describe, expect, it } from "vitest";
import { isValidGtin, normalizeGtin } from "@/lib/gtin";

describe("normalizeGtin", () => {
  it("normalizes an EAN-13 to 14 digits", () => {
    expect(normalizeGtin("4006381333931")).toBe("04006381333931");
  });

  it("normalizes a UPC-A (12) to 14 digits", () => {
    expect(normalizeGtin("036000291452")).toBe("00036000291452");
  });

  it("normalizes an EAN-8 to 14 digits", () => {
    expect(normalizeGtin("96385074")).toBe("00000096385074");
  });

  it("accepts a GTIN-14 unchanged", () => {
    expect(normalizeGtin("14006381333938")).toBe("14006381333938");
  });

  it("ignores spaces and hyphens", () => {
    expect(normalizeGtin(" 4006381-333931 ")).toBe("04006381333931");
  });

  it("rejects a wrong check digit, invalid length and letters", () => {
    expect(normalizeGtin("4006381333932")).toBeNull();
    expect(normalizeGtin("12345")).toBeNull();
    expect(normalizeGtin("40063813339A1")).toBeNull();
    expect(normalizeGtin("")).toBeNull();
  });

  it("isValidGtin mirrors normalizeGtin", () => {
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("4006381333932")).toBe(false);
  });
});
