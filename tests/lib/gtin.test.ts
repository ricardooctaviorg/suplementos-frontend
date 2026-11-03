import { describe, expect, it } from "vitest";
import { isValidGtin, normalizeGtin } from "@/lib/gtin";

describe("normalizeGtin", () => {
  it("normaliza un EAN-13 a 14 dígitos", () => {
    expect(normalizeGtin("4006381333931")).toBe("04006381333931");
  });

  it("normaliza un UPC-A (12) a 14 dígitos", () => {
    expect(normalizeGtin("036000291452")).toBe("00036000291452");
  });

  it("normaliza un EAN-8 a 14 dígitos", () => {
    expect(normalizeGtin("96385074")).toBe("00000096385074");
  });

  it("acepta un GTIN-14 sin cambios", () => {
    expect(normalizeGtin("14006381333938")).toBe("14006381333938");
  });

  it("ignora espacios y guiones", () => {
    expect(normalizeGtin(" 4006381-333931 ")).toBe("04006381333931");
  });

  it("rechaza dígito verificador incorrecto, longitud inválida y letras", () => {
    expect(normalizeGtin("4006381333932")).toBeNull();
    expect(normalizeGtin("12345")).toBeNull();
    expect(normalizeGtin("40063813339A1")).toBeNull();
    expect(normalizeGtin("")).toBeNull();
  });

  it("isValidGtin refleja normalizeGtin", () => {
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("4006381333932")).toBe(false);
  });
});
