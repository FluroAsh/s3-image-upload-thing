import path from "node:path";

import type { NextConfig } from "next";

// `~/shared` sits beside this folder. The Docker image has no lockfile above `client/`, so without this the bundler takes `client/` as its root and cannot see it.
const repoRoot = path.join(import.meta.dirname, "..");

const nextConfig: NextConfig = {
	turbopack: { root: repoRoot },
	outputFileTracingRoot: repoRoot,
	async rewrites() {
		// Required for Production builds to proxy /proxy/* requests to the Docker-internal API service
		// This will always be executed on the server, so we don't need a "client" safe URL with an actual hostname
		const apiUrl = process.env.API_URL || "http://localhost:3002";
		return [
			{
				source: "/proxy/:path*",
				destination: `${apiUrl}/:path*`,
			},
		];
	},
};

export default nextConfig;
