import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel" };

export default function PanelPage() {
  return (
    <main style={{ padding: "2rem 1rem" }}>
      <h1>Panel de gestión</h1>
      <p>
        <em>En construcción (fase 1 y 2).</em>
      </p>
    </main>
  );
}
