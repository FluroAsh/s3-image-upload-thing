# Notes

- Requires `darktable` to be installed and available on the host system — this handles raw image formats such as `.NEF`
  - Note that `darktable` will return the RAW image data, not the processed `.jpeg` preview image

## Environment

- `BUCKET_CDN_PREFIXES`: optional JSON object mapping a bucket name to the path prefix its objects have on the CDN, e.g. `{"<strapi-bucket>":"legacy/"}`. A bucket not listed serves from the CDN root. Read once at startup, so a malformed value stops the server from starting.
