/**
 * Response types of the backend contract (`docs/ARCHITECTURE.md`, "Endpoints").
 * Hand-written and minimal until there is a shared schema package.
 */
import type { TenantColors } from "@/lib/theme/theme";

/** `GET /api/public/tenants/:slug` */
export interface PublicTenant {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  colors: TenantColors;
}
