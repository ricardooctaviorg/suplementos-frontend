import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getErrorUserMessage, resolveApiUrl } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getPublicTenant } from "@/lib/api/tenants";

function mockFetch(response: Response) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it.each([
    ["INVALID_CREDENTIALS", "No pudimos iniciar sesión con esos datos. Revisa el correo y la contraseña."],
    ["TENANT_NOT_FOUND", "No encontramos un negocio con ese identificador."],
    ["RATE_LIMITED", "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."],
  ])("maps the login error %s", (code, text) => {
    expect(getApiErrorMessage(code)).toBe(text);
  });
});

describe("getErrorUserMessage", () => {
  it("uses the API error text or the generic message for anything else", () => {
    expect(getErrorUserMessage(new ApiError(429, "RATE_LIMITED", "Too many"))).toBe(
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    );
    expect(getErrorUserMessage(new TypeError("Failed to fetch"))).toBe("Ocurrió un error inesperado.");
  });
});

describe("apiFetch", () => {
  it("serializes the json option and sets the content type", async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }));

    await apiFetch("/api/auth/login", { method: "POST", json: { email: "a@b.mx" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.body).toBe('{"email":"a@b.mx"}');
    expect(init?.headers).toMatchObject({ "Content-Type": "application/json", Accept: "application/json" });
  });

  it("resolves 204 responses to undefined", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiFetch<void>("/api/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws an ApiError with the backend code", async () => {
    mockFetch(jsonResponse({ error: { code: "RATE_LIMITED", message: "Too many requests" } }, 429));
    await expect(apiFetch("/api/auth/login")).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });
});

describe("getPublicTenant", () => {
  it("rejects an invalid slug without calling the API", async () => {
    const fetchMock = mockFetch(jsonResponse({}));
    await expect(getPublicTenant("../admin")).rejects.toMatchObject({ code: "TENANT_NOT_FOUND" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the public tenant endpoint with the slug", async () => {
    const fetchMock = mockFetch(jsonResponse({ slug: "mi-tienda" }));
    await getPublicTenant("mi-tienda");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/public\/tenants\/mi-tienda$/);
  });
});
