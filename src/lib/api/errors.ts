import { es, type ApiErrorCode } from "@/messages/es";

function isKnownErrorCode(code: string): code is ApiErrorCode {
  return code !== "fallback" && Object.hasOwn(es.apiErrors, code);
}

/** Maps an API error `code` to user-facing text, falling back to a generic message. */
export function getApiErrorMessage(code: string): string {
  return isKnownErrorCode(code) ? es.apiErrors[code] : es.apiErrors.fallback;
}
