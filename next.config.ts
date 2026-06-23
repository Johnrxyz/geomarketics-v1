import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.1.100'],



  // Image optimization — allow external images if needed
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
