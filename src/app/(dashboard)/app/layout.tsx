import { Suspense, type ReactNode } from "react";
import { SessionHeader } from "@/components/dashboard/session-header";
import { getCurrentSession } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Minimal guard: nothing under /app renders until the backend confirms the session.
 * Reading the request cookies requires the Suspense boundary (Cache Components).
 */
async function SessionGate({ children }: { children: ReactNode }) {
  const { user, tenant } = await getCurrentSession();
  return (
    <>
      <SessionHeader userName={user.name} tenantName={tenant.displayName} />
      {children}
    </>
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<p role="status">{es.dashboard.loadingSession}</p>}>
      <SessionGate>{children}</SessionGate>
    </Suspense>
  );
}
