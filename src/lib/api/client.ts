import { getApiErrorMessage } from "./errors";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

/**
 * In the browser, use the relative path (same origin; Next forwards it to the backend).
 * On the server (SSR), call the backend directly.
 */
export function resolveApiUrl(path: string, isServer: boolean = typeof window === "undefined"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return isServer ? `${BACKEND_URL}${normalized}` : normalized;
}

export class ApiError extends Error {
  /** Spanish text safe to show to the user, derived from `code`. */
  public readonly userMessage: string;

  constructor(
    public readonly status: number,
    public readonly code: string,
    /** Technical message from the backend (English); not for display. */
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.userMessage = getApiErrorMessage(code);
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

export interface ApiFetchInit extends RequestInit {
  /** JSON request body; serialized and sent with `Content-Type: application/json`. */
  json?: unknown;
}

/**
 * Typed request to the API. Responses without content (204) resolve to `undefined`,
 * so callers of such endpoints should use `apiFetch<void>`.
 */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const response = await fetch(resolveApiUrl(path), {
    ...rest,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** User-facing Spanish text for any error thrown by an API call (network failures included). */
export function getErrorUserMessage(error: unknown): string {
  return error instanceof ApiError ? error.userMessage : getApiErrorMessage("UNKNOWN_ERROR");
}
