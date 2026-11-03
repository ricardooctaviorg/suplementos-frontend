import type { NextConfig } from "next";

// El navegador siempre llama a /api/* en el mismo origen del front;
// Next lo reenvía al backend. Así la cookie de sesión pertenece al dominio del front.
// BACKEND_URL debe estar disponible también en tiempo de build (los rewrites se fijan ahí).
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
