import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Gzip/Brotli compress all responses — critical for large SVG floor plans
  compress: true,
  // Allow any device on the local subnet — covers phones, tablets, etc.
  // The wildcard matches 192.168.1.1 through 192.168.1.254.
  allowedDevOrigins: ['192.168.1.100', '192.168.1.102', '192.168.1.*'],

  // Image optimization — allow external images if needed
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.openstreetmap.org" },
    ],
  },

  // Aggressive caching for static SVG floor plans — they rarely change.
  // On a slow mobile connection this means the SVGs are only ever downloaded once.
  async headers() {
    return [
      {
        // Cache all SVG floor plan assets for 1 year (immutable)
        source: "/:path*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
