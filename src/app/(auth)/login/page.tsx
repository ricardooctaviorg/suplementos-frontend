import type { Metadata } from "next";
import { es } from "@/messages/es";

export const metadata: Metadata = { title: es.login.title };

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>{es.login.heading}</h1>
      <p>{es.login.instructions}</p>
      <p>
        <em>{es.login.underConstruction}</em>
      </p>
    </main>
  );
}
