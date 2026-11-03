import { describe, expect, it } from "vitest";
import { ApiError, resolveApiUrl } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

describe("resolveApiUrl", () => {
  it("returns the relative path in the browser (same origin)", () => {
    expect(resolveApiUrl("/api/health", false)).toBe("/api/health");
  });

  it("points directly at the backend on the server", () => {
    expect(resolveApiUrl("/api/health", true)).toMatch(/^https?:\/\/.+\/api\/health$/);
  });

  it("adds the leading slash if missing", () => {
    expect(resolveApiUrl("api/health", false)).toBe("/api/health");
  });
});

describe("ApiError", () => {
  it("maps a known code to Spanish user text", () => {
    const error = new ApiError(404, "NOT_FOUND", "Resource not found");
    expect(error.userMessage).toBe("No encontramos lo que buscas.");
    expect(error.message).toBe("Resource not found");
  });

  it("uses the generic message for unknown codes", () => {
    expect(new ApiError(418, "TEAPOT", "I'm a teapot").userMessage).toBe("Ocurrió un error inesperado.");
  });
});

describe("getApiErrorMessage", () => {
  it("does not resolve inherited object keys or the fallback key as codes", () => {
    expect(getApiErrorMessage("toString")).toBe("Ocurrió un error inesperado.");
    expect(getApiErrorMessage("fallback")).toBe("Ocurrió un error inesperado.");
  });

  it("maps backend codes to their specific messages", () => {
    expect(getApiErrorMessage("VALIDATION_ERROR")).toBe("Revisa los datos e inténtalo de nuevo.");
    expect(getApiErrorMessage("UNAUTHORIZED")).toBe("Tu sesión no es válida o expiró. Inicia sesión de nuevo.");
  });
});
