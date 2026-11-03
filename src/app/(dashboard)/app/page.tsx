import type { Metadata } from "next";
import { es } from "@/messages/es";

export const metadata: Metadata = { title: es.dashboard.title };

export default function DashboardPage() {
  return (
    <main style={{ padding: "2rem 1rem" }}>
      <h1>{es.dashboard.heading}</h1>
      <p>
        <em>{es.dashboard.underConstruction}</em>
      </p>
    </main>
  );
}
