import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TenantSlugForm } from "@/components/login/tenant-slug-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const tenant = {
  slug: "mi-tienda",
  displayName: "Mi Tienda",
  logoUrl: null,
  colors: { primary: "#111111", secondary: "#222222", accent: "#333333", background: "#ffffff", text: "#000000" },
};

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  push.mockReset();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const user = userEvent.setup();
  render(<TenantSlugForm />);
  const input = screen.getByLabelText("Identificador del negocio");
  return { user, input };
}

describe("TenantSlugForm", () => {
  it("asks for the slug when the field is empty", async () => {
    const { user, input } = setup();

    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Escribe el identificador de tu negocio.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid format without calling the API", async () => {
    const { user, input } = setup();

    await user.type(input, "mi--tienda{Enter}");

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/solo puede tener letras/);
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes the slug and navigates to the credentials step", async () => {
    fetchMock.mockResolvedValue(jsonResponse(tenant));
    const { user, input } = setup();

    await user.type(input, "  Mi-Tienda {Enter}");

    expect(input).toHaveValue("mi-tienda");
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/public/tenants/mi-tienda");
    expect(push).toHaveBeenCalledWith("/login/mi-tienda");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows TENANT_NOT_FOUND in Spanish on the field", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: "TENANT_NOT_FOUND", message: "Not found" } }, 404));
    const { user, input } = setup();

    await user.type(input, "no-existe{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos un negocio con ese identificador.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows a generic message when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { user, input } = setup();

    await user.type(input, "mi-tienda{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Ocurrió un error inesperado.");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("disables the button with a pending label while the request runs", async () => {
    let resolve: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { user, input } = setup();

    await user.type(input, "mi-tienda{Enter}");

    expect(screen.getByRole("button", { name: "Buscando negocio…" })).toBeDisabled();
    resolve(jsonResponse({ error: { code: "TENANT_NOT_FOUND", message: "Not found" } }, 404));
    expect(await screen.findByRole("button", { name: "Continuar" })).toBeEnabled();
  });
});
