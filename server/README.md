# Notes

- Requires `darktable` to be installed and available on the host system — this handles raw image formats such as `.NEF`
  - Note that `darktable` will return the RAW image data, not the processed `.jpeg` preview image

## Environment

- `AWS_REGION`: optional region of `COLLECTIONS_BUCKET`, also used for account-level calls; unset or empty means `us-east-1`.
- `BUCKET_CDN_PREFIXES`: optional JSON object mapping a bucket name to the path prefix its objects have on the CDN, e.g. `{"<strapi-bucket>":"legacy/"}`. A bucket not listed serves from the CDN root; unset or empty means no prefixes. Read once at startup, so a malformed value stops the server from starting.
- `COLLECTIONS_BUCKET`: bucket that holds `gallery/collections.json`, e.g. `<collections-bucket>`, in the default `AWS_REGION`. A set whose path starts with a `BUCKET_CDN_PREFIXES` prefix lives in that prefix's bucket; every other set lives in this one. The server's credentials must be able to read both. Read once at startup; the `/storage/collections` routes answer 500 while it is unset.
