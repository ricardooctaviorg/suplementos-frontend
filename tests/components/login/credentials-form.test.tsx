import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialsForm } from "@/components/login/credentials-form";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function errorResponse(code: string, status: number): Response {
  return jsonResponse({ error: { code, message: "English technical message" } }, status);
}

const session = {
  user: { email: "ana@tienda.mx", name: "Ana", role: "owner" },
  tenant: { slug: "mi-tienda", displayName: "Mi Tienda" },
};

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const user = userEvent.setup();
  render(<CredentialsForm tenantSlug="mi-tienda" />);
  return {
    user,
    email: screen.getByLabelText("Correo electrónico"),
    password: screen.getByLabelText("Contraseña"),
    submit: () => user.click(screen.getByRole("button", { name: "Iniciar sesión" })),
  };
}

describe("CredentialsForm", () => {
  it("uses the autocomplete hints password managers expect", () => {
    const { email, password } = setup();
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(password).toHaveAttribute("autocomplete", "current-password");
  });

  it("validates both fields in Spanish before calling the API", async () => {
    const { user, email, password, submit } = setup();

    await submit();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveFocus();
    const emailError = screen.getByText("Escribe tu correo electrónico.");
    expect(emailError).toHaveAttribute("role", "alert");
    expect(email).toHaveAttribute("aria-describedby", emailError.id);
    expect(screen.getByText("Escribe tu contraseña.")).toBeInTheDocument();
    expect(password).toHaveAttribute("aria-invalid", "true");

    await user.type(email, "ana@");
    await submit();
    expect(screen.getByText(/Escribe un correo electrónico válido/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs in through the same-origin proxy and goes to /app", async () => {
    fetchMock.mockResolvedValue(jsonResponse(session));
    const { user, email, password } = setup();

    await user.type(email, "  ana@tienda.mx ");
    await user.type(password, "secret-password{Enter}");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      tenantSlug: "mi-tienda",
      email: "ana@tienda.mx",
      password: "secret-password",
    });
    expect(replace).toHaveBeenCalledWith("/app");
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the email, clears the password and focuses it on INVALID_CREDENTIALS", async () => {
    fetchMock.mockResolvedValue(errorResponse("INVALID_CREDENTIALS", 401));
    const { user, email, password } = setup();

    await user.type(email, "ana@tienda.mx");
    await user.type(password, "wrong-password{Enter}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos iniciar sesión con esos datos. Revisa el correo y la contraseña.");
    expect(email).toHaveValue("ana@tienda.mx");
    expect(password).toHaveValue("");
    expect(password).toHaveFocus();
    expect(password).toHaveAttribute("aria-invalid", "true");
    expect(password).toHaveAttribute("aria-describedby", alert.id);
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    ["RATE_LIMITED", 429, "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."],
    ["VALIDATION_ERROR", 400, "Revisa los datos e inténtalo de nuevo."],
    ["UNAUTHORIZED", 401, "Tu sesión no es válida o expiró. Inicia sesión de nuevo."],
    ["SOMETHING_NEW", 500, "Ocurrió un error inesperado."],
  ])("shows %s in Spanish and keeps the button enabled", async (code, status, text) => {
    fetchMock.mockResolvedValue(errorResponse(code, status));
    const { user, email, password } = setup();

    await user.type(email, "ana@tienda.mx");
    await user.type(password, "secret-password{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
  });

  it("disables the button with a pending label while the request runs", async () => {
    let resolve: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { user, email, password } = setup();

    await user.type(email, "ana@tienda.mx");
    await user.type(password, "secret-password{Enter}");

    expect(screen.getByRole("button", { name: "Iniciando sesión…" })).toBeDisabled();
    resolve(errorResponse("RATE_LIMITED", 429));
    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeEnabled();
  });
});
