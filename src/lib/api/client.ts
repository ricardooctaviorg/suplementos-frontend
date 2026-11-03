const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

/**
 * En el navegador se usa la ruta relativa (mismo origen, Next la reenvía al backend).
 * En el servidor (SSR) se llama al backend directamente.
 */
export function resolveApiUrl(path: string, isServer: boolean = typeof window === "undefined"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return isServer ? `${BACKEND_URL}${normalized}` : normalized;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? "Ocurrió un error inesperado",
    );
  }

  return (await response.json()) as T;
}
