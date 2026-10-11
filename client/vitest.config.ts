import path from "node:path";

import { defineConfig } from "vitest/config";

// Mirrors the `paths` in tsconfig.json, which Vitest does not read.
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"~": path.resolve(__dirname, ".."),
		},
	},
});
