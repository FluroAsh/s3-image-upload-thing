export type ManifestSource = {
  key: string;
  /** True when the source is itself a published URL (a flat set's `original`). */
  public: boolean;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
};

export type ManifestVariant = {
  /** Bucket key, never the public path: a URL is CDN host + `pathPrefix` + `key`. */
  key: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  etag: string;
};

export type Manifest = {
  /** Consumers treat an unknown value as "no manifest", so the shape can change without a joint deploy. */
  schema: 1;
  name: string;
  folder: string;
  /** Bucket that holds the variants. */
  bucket: string;
  /** How that bucket's keys appear under the CDN host: `""` or `"legacy/"`. */
  pathPrefix: string;
  layout: "nested" | "flat";
  status: "ready";
  createdAt: string;
  /** Base64 data URI of a 20px blurred copy. */
  placeholder: string | null;
  source: ManifestSource | null;
  /** Keyed by the name found in the key, so names outside the current variant table are kept. */
  variants: Record<string, ManifestVariant>;
};
