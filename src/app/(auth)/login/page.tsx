import type { Metadata } from "next";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>Iniciar sesión</h1>
      <p>Paso 1: escribe el identificador de tu negocio. Paso 2: correo y contraseña.</p>
      <p>
        <em>En construcción (fase 1).</em>
      </p>
    </main>
  );
}
