import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cronos.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'explorer.cronos.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cronos.org',
      },
    ],
  },
};

export default nextConfig;
