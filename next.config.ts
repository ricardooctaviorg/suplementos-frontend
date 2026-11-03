import type { NextConfig } from "next";

// The browser always calls /api/* on the frontend's own origin;
// Next forwards it to the backend, so the session cookie belongs to the frontend domain.
// BACKEND_URL must also be available at build time (rewrites are fixed then).
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
