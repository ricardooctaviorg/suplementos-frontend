import { apiFetch } from "./client";
import type { LoginInput, SessionInfo } from "./types";

/** Browser call: the backend sets the httpOnly session cookie on the frontend origin. */
export function login(input: LoginInput): Promise<SessionInfo> {
  return apiFetch<SessionInfo>("/api/auth/login", { method: "POST", json: input });
}

/** Browser call: idempotent; the backend deletes the session and clears the cookie. */
export function logout(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", { method: "POST" });
}
