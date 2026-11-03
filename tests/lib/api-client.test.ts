import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "@/lib/api/client";

describe("resolveApiUrl", () => {
  it("en el navegador devuelve la ruta relativa (mismo origen)", () => {
    expect(resolveApiUrl("/api/health", false)).toBe("/api/health");
  });

  it("en el servidor apunta directo al backend", () => {
    expect(resolveApiUrl("/api/health", true)).toMatch(/^https?:\/\/.+\/api\/health$/);
  });

  it("agrega la barra inicial si falta", () => {
    expect(resolveApiUrl("api/health", false)).toBe("/api/health");
  });
});
