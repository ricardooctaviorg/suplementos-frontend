import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ApiError } from "@/lib/api/client";
import { serverApiFetch } from "@/lib/api/server";
import type { SessionInfo } from "@/lib/api/types";

/**
 * Current session, verified by the backend on every request (the source of truth).
 * Redirects to `/login` when there is no valid session. Deduplicated per request only.
 */
export const getCurrentSession = cache(async (): Promise<SessionInfo> => {
  let session: SessionInfo | null = null;
  try {
    session = await serverApiFetch<SessionInfo>("/api/auth/me");
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }

  // redirect() throws, so it stays outside the try block.
  if (session === null) redirect("/login");
  return session;
});
