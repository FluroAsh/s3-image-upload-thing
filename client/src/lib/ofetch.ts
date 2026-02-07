import { ofetch } from "ofetch";

/*
 * Get the appropriate API URL based on execution context.
 *
 * - **Server-side (SSR)**: Directly uses the backend URL from `API_URL` env var (ie. http://s3-image-upload-server:5101)
 * - **Client-side (Browser)**: Proxies requests using `/proxy` prefix, which Next.js rewrites to the backend
 *
 * This approach allows the same codebase to work in both local development and production
 * without hardcoding URLs or requiring rebuilds when the backend location changes.
 */
const isServer = typeof window === "undefined";
const baseURL = isServer
  ? process.env.API_URL || "http://localhost:3002"
  : "/proxy";

const ofetchInstance = ofetch.create({
  baseURL,
  headers: {
    "x-amz-bucket-region":
      process.env.NEXT_PUBLIC_S3_REGION || "ap-southeast-2",
  },
});

export default ofetchInstance;
