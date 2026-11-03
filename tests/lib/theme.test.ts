import { describe, expect, it } from "vitest";
import { DEFAULT_COLORS, themeToCssVars } from "@/lib/theme/theme";

describe("themeToCssVars", () => {
  it("converts the palette into CSS variables", () => {
    const vars = themeToCssVars({ ...DEFAULT_COLORS, primary: "#ff0000" });
    expect(vars["--color-primary"]).toBe("#ff0000");
    expect(vars["--color-text"]).toBe(DEFAULT_COLORS.text);
  });

  it("uses the default when a color is missing", () => {
    const vars = themeToCssVars({});
    expect(vars["--color-primary"]).toBe(DEFAULT_COLORS.primary);
  });

  it("discards values that are not strict hex (prevents style injection)", () => {
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
