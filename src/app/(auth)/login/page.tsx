import type { Metadata } from "next";
import { TenantSlugForm } from "@/components/login/tenant-slug-form";
import { es } from "@/messages/es";
import styles from "./login.module.css";

export const metadata: Metadata = { title: es.login.title };

export default function LoginPage() {
  return (
    <main className={styles.main}>
      <h1>{es.login.heading}</h1>
      <p>{es.login.tenantStep.instructions}</p>
      <TenantSlugForm />
    </main>
  );
}
