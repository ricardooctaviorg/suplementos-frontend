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

/** `user` in `POST /api/auth/login` and `GET /api/auth/me` */
export interface SessionUser {
  email: string;
  name: string;
  role: "owner";
}

/** `POST /api/auth/login` and `GET /api/auth/me` */
export interface SessionInfo {
  user: SessionUser;
  tenant: { slug: string; displayName: string };
}

/** `POST /api/auth/login` body */
export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}
