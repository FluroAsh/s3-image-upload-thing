# One file per upload request

**Status:** accepted, 2026-11-13

## Context

The upload modal sent every picked file in one multipart request through the Next.js `/proxy` rewrite to the Bun + Hono server. A batch of 56 camera JPEGs (about 800 MB) failed with a 500 and stored nothing. Four limits sat on that path:

- **Next.js rewrite proxy:** cuts the request body off at `experimental.proxyClientMaxBodySize`, 10 MB by default. The server sees a hung-up socket and Next answers 500, so even one 15 MB photo failed.
- **Bun body limit:** `maxRequestBodySize` defaults to 128 MB. The server entry passed `undefined`, so Hono's "unlimited" `bodyLimit` never applied.
- **Bun idle timeout:** `idleTimeout` defaults to 10 s, which drops a request while sharp and S3 work on it in silence.
- **Next proxy timeout:** `experimental.proxyTimeout` defaults to 30 s of inactivity.

Raising the limits alone would hold the whole batch in memory several times over: Next's body clone, Bun's `formData()` and each file's `arrayBuffer()`. All the images would also go through sharp at once. That risks killing the small homelab box the server runs on. Hono has no streaming multipart parser, and sharp needs each whole file anyway.

## Decision

The client sends each file in its own request to the existing `POST /storage/upload`, with at most 3 in flight (`uploadEach` in `client/src/lib/upload-each.ts`). A request that fails becomes a `failed` row for that file only, so the existing "Retry failed" covers it. One shared constant, `MAX_UPLOAD_REQUEST_BYTES` (100 MB), sets both the server's body limit and the proxy's. The client refuses a larger file before sending it, because past the limit the server resets the connection and the proxy can only report a bare 500. Both timeouts are raised to cover one photo's processing.

## Options considered

| Option | Effort | Why not chosen |
|---|---|---|
| Raise the limits, keep one request | S | Unbounded memory, no progress, and one failure loses the batch. |
| Browser uploads straight to S3 with presigned URLs, then the server processes | M–L | Needs S3 CORS on every bucket, a staging prefix (the original's key depends on sharp metadata) and a second download of every original. Revisit if single files pass about 100 MB (video, RAW). |
| Browser calls the API directly, skipping the proxy | S | Needs a browser-visible API URL and risks mixed-content blocks under HTTPS. Not needed once each request is one photo. |
| Background job with polling or SSE | M | Doesn't fix getting the bytes in, and adds job state that a restart loses. Over-engineered for one user. |
| Server parses the upload as it streams in | M | Needs a new dependency, and sharp still buffers each file. |

## Consequences

- Server memory scales with the concurrency, not the batch size. If the box swaps, lower `UPLOAD_CONCURRENCY`.
- The server's duplicate-name check only sees one request, so the client refuses a repeated name before sending it.
- Progress is counted per file, not per byte.
- The proxy limits are baked into `.next` at build time, so changing them needs a client rebuild.
- Deploy hooks still fire once per batch, because their 2-minute debounce restarts on each stored file.
