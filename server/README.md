# Notes

- Requires `darktable` to be installed and available on the host system — this handles raw image formats such as `.NEF`
  - Note that `darktable` will return the RAW image data, not the processed `.jpeg` preview image

## Environment

- `COLLECTIONS_BUCKET`: bucket that holds `gallery/collections.json`, e.g. `<collections-bucket>`, in the default `AWS_REGION`. Every set a collection records lives in this bucket, keyed by its path. Read once at startup; the `/storage/collections` routes answer 500 while it is unset.
