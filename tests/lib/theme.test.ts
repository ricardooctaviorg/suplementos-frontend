import { describe, expect, it } from "vitest";
import { DEFAULT_COLORS, themeToCssVars } from "@/lib/theme/theme";

describe("themeToCssVars", () => {
  it("convierte la paleta en variables CSS", () => {
    const vars = themeToCssVars({ ...DEFAULT_COLORS, primary: "#ff0000" });
    expect(vars["--color-primary"]).toBe("#ff0000");
    expect(vars["--color-text"]).toBe(DEFAULT_COLORS.text);
  });

  it("usa el valor por defecto si falta un color", () => {
    const vars = themeToCssVars({});
    expect(vars["--color-primary"]).toBe(DEFAULT_COLORS.primary);
  });

  it("descarta valores que no son hex estricto (evita inyección de estilos)", () => {
    const vars = themeToCssVars({
      primary: "red; background: url(https://evil.example)",
      accent: "#fff",
      text: "#12345G",
    });
    expect(vars["--color-primary"]).toBe(DEFAULT_COLORS.primary);
    expect(vars["--color-accent"]).toBe(DEFAULT_COLORS.accent);
    expect(vars["--color-text"]).toBe(DEFAULT_COLORS.text);
  });
});
