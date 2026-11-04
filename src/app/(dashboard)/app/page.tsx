import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentSession } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = { title: es.dashboard.title };

/**
 * The layout guard does not stop this segment from rendering into the RSC payload,
 * so the page verifies the session itself (deduplicated with the layout's call).
 */
async function DashboardHome() {
  await getCurrentSession();
  return (
    <main style={{ padding: "2rem 1rem" }}>
      <h1>{es.dashboard.heading}</h1>
      <p>
        <em>{es.dashboard.underConstruction}</em>
      </p>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardHome />
    </Suspense>
  );
}
