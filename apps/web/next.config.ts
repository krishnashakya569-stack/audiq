import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "e-cdns-images.dzcdn.net",
      },
      {
        protocol: "https",
        hostname: "*.mzstatic.com",
      },
    ],
  },
};

export default nextConfig;
