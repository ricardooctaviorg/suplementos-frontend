import { isValidTenantSlug } from "@/lib/tenant-slug";
import { ApiError, apiFetch, type ApiFetchInit } from "./client";
import type { PublicTenant } from "./types";

/**
 * Resolves a tenant by its (normalized) slug. An invalid format is rejected before
 * building the URL, with the same error the backend uses for an unknown tenant.
 */
export function getPublicTenant(slug: string, init: ApiFetchInit = {}): Promise<PublicTenant> {
  if (!isValidTenantSlug(slug)) {
    return Promise.reject(new ApiError(404, "TENANT_NOT_FOUND", "Invalid tenant slug format"));
  }
  return apiFetch<PublicTenant>(`/api/public/tenants/${encodeURIComponent(slug)}`, init);
}
