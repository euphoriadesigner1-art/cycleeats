import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "world.openfoodfacts.org" }],
  },
};

export default nextConfig;
