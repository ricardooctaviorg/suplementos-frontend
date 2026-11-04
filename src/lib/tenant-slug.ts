/**
 * Tenant slug format, mirroring the backend (`docs/DOMAIN-MODEL.md`):
 * lowercase a-z and 0-9 groups joined by single hyphens, 3 to 40 characters.
 * Reserved slugs are not checked here; the backend answers TENANT_NOT_FOUND for them.
 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const TENANT_SLUG_MIN_LENGTH = 3;
export const TENANT_SLUG_MAX_LENGTH = 40;

export function normalizeTenantSlug(input: string): string {
  return input.trim().toLowerCase();
}

/** Expects an already normalized slug. */
export function isValidTenantSlug(slug: string): boolean {
  return (
    slug.length >= TENANT_SLUG_MIN_LENGTH &&
    slug.length <= TENANT_SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}
