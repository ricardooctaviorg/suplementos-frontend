import "server-only";
import { cookies } from "next/headers";
import { apiFetch, type ApiFetchInit } from "./client";

/**
 * Server-side API call on behalf of the current request: forwards its cookies
 * (the session included) to the backend and never caches the response.
 * Reads `cookies()`, so callers must render inside a `<Suspense>` boundary.
 */
export async function serverApiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  return apiFetch<T>(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...init.headers,
      ...(cookieHeader !== "" ? { Cookie: cookieHeader } : {}),
    },
  });
}
