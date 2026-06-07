import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.100'],

  // ── Root redirect: / → /login ──────────────────────────────────────────────
  // Handled at the router level so it works regardless of SSR/Turbopack quirks.
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false, // 307 — keeps flexibility to change later
      },
    ];
  },

  // Image optimization — allow external images if needed
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
