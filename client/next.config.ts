import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Required for Production builds to proxy /proxy/* requests to the Docker-internal API service
    // This will always be executed on the server, so we don't need a "client" safe URL with an actual hostname
    const apiUrl = process.env.API_URL || 'http://localhost:3002';
    return [
      {
        source: '/proxy/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
