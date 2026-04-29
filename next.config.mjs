/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "world.openfoodfacts.org" }],
  },
};

export default nextConfig;
