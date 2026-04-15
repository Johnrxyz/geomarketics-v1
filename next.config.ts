import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Recharts SSR dimension warnings (charts render in browser only)
  reactStrictMode: true,

  // Image optimization — allow external images if needed
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
