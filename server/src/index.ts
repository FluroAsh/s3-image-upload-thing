import { MAX_UPLOAD_REQUEST_BYTES } from "~/shared/constants/upload";

import app from "./app";

Bun.serve({
	fetch: app.fetch,
	port: app.port,
	maxRequestBodySize: MAX_UPLOAD_REQUEST_BYTES,
	/** Bun's maximum, in seconds; the 10 s default drops an upload while sharp and S3 work on it in silence. */
	idleTimeout: 255,
});
