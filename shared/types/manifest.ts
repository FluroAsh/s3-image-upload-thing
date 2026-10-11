export type ManifestSource = {
  /** Bucket key of the image the variants were made from. */
  key: string;
  /** True when the source is itself a published URL (a flat set's `original`). */
  public: boolean;
  /** Hex SHA-256 of the source file's bytes. */
  sha256: string;
  /** Size of the source file in bytes. */
  bytes: number;
  /** Pixel width of the source image. */
  width: number;
  /** Pixel height of the source image. */
  height: number;
};

export type ManifestVariant = {
  /** Bucket key, never the public path: a URL is CDN host + `pathPrefix` + `key`. */
  key: string;
  /** Image format as a file extension without the dot, e.g. `"webp"`. */
  format: string;
  /** Pixel width of the stored variant, as measured, not as configured. */
  width: number;
  /** Pixel height of the stored variant, as measured. */
  height: number;
  /** Size of the stored variant in bytes. */
  bytes: number;
  /** S3 ETag of the stored object; two variants sharing one are the same file. */
  etag: string;
};

export type Manifest = {
  /** Consumers treat an unknown value as "no manifest", so the shape can change without a joint deploy. */
  schema: 1;
  /** Base name of the image set, without variant prefix or extension. */
  name: string;
  /** Bucket folder the set lives in, without a trailing slash; `""` for the bucket root. */
  folder: string;
  /** Bucket that holds the variants. */
  bucket: string;
  /** How that bucket's keys appear under the CDN host: `""` or `"legacy/"`. */
  pathPrefix: string;
  /** `nested`: `{folder}/{name}/{variant}_{name}.webp`. `flat`: `{folder}/{variant}_{name}.webp` beside an un-prefixed original. */
  layout: "nested" | "flat";
  /** Always `"ready"`: a manifest is written only after every variant is stored. */
  status: "ready";
  /** ISO 8601 time the manifest was built. */
  createdAt: string;
  /** Base64 data URI of a 20px blurred copy, or `null` when none could be made. */
  placeholder: string | null;
  /** The image the variants were made from, or `null` when it was not kept. */
  source: ManifestSource | null;
  /** Keyed by the name found in the key, so names outside the current variant table are kept. */
  variants: Record<string, ManifestVariant>;
};
