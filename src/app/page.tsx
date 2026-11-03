import Link from "next/link";
import { es } from "@/messages/es";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1rem" }}>
      <h1>{es.home.heading}</h1>
      <p>{es.home.tagline}</p>
      <p>
        <Link href="/login">{es.home.loginLink}</Link>
      </p>
    </main>
  );
}
