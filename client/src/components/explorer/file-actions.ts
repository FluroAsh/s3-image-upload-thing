/** A presigned URL without its signature: the address the CDN serves the object at. */
export const publicUrlOf = (presignedUrl: string) => presignedUrl.split("?")[0];

/** Opens the signed URL in a new tab; the bucket sends no CORS headers, so a fetch-and-save download is blocked and the `download` attribute is ignored cross-origin. */
export const openFile = (url: string) => window.open(url, "_blank", "noopener");
