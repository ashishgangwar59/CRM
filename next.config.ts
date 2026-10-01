import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ignore ESLint and TS errors during production build to save RAM and time
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Limit CPU workers so it doesn't overwhelm a 2GB RAM server
  experimental: {
    cpus: 1,
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
};

export default nextConfig;
