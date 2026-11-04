import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { CredentialsForm } from "@/components/login/credentials-form";
import { ApiError } from "@/lib/api/client";
import { getPublicTenant } from "@/lib/api/tenants";
import type { PublicTenant } from "@/lib/api/types";
import { normalizeTenantSlug } from "@/lib/tenant-slug";
import { themeToCssVars } from "@/lib/theme/theme";
import { es } from "@/messages/es";
import styles from "../login.module.css";

export const metadata: Metadata = { title: es.login.title };

/** Unknown, suspended or malformed tenants all go back to step 1. */
async function resolveTenantOrRedirect(slug: string): Promise<PublicTenant> {
  let tenant: PublicTenant | null = null;
  try {
    tenant = await getPublicTenant(normalizeTenantSlug(slug), { cache: "no-store" });
  } catch (error) {
    if (!(error instanceof ApiError && error.code === "TENANT_NOT_FOUND")) throw error;
  }

  // redirect() throws, so it stays outside the try block.
  if (tenant === null) redirect("/login");
  return tenant;
}

async function CredentialsStep({ params }: Pick<PageProps<"/login/[slug]">, "params">) {
  const { slug } = await params;
  const tenant = await resolveTenantOrRedirect(slug);

  return (
    <div className={styles.zone} style={themeToCssVars(tenant.colors) as CSSProperties}>
      <main className={styles.main}>
        <h1>{tenant.displayName}</h1>
        <p>{es.login.credentialsStep.instructions}</p>
        <CredentialsForm tenantSlug={tenant.slug} />
        <p>
          <Link href="/login">{es.login.credentialsStep.changeTenant}</Link>
        </p>
      </main>
    </div>
  );
}

export default function CredentialsPage({ params }: PageProps<"/login/[slug]">) {
  return (
    <Suspense
      fallback={
        <main className={styles.main}>
          <p role="status">{es.login.credentialsStep.loading}</p>
        </main>
      }
    >
      <CredentialsStep params={params} />
    </Suspense>
  );
}
