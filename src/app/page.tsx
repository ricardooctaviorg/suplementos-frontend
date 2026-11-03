import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>Suplementos</h1>
      <p>Plataforma de inventario y catálogo para negocios locales.</p>
      <p>
        <Link href="/login">Entrar al panel de mi negocio</Link>
      </p>
    </main>
  );
}
