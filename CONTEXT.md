# Context

An image upload service and its admin: it stores each uploaded image in an S3 bucket as a set of resized files plus a manifest, and groups sets into collections for a portfolio site. Bucket names in examples are placeholders; the only real one here is the dev bucket `express-image-upload-dev`.

## Glossary

**Bucket**: An S3 bucket the service reads and writes. Every request names one by its **bucket location**.
**Bucket location**: A bucket's name plus its AWS region (`BucketLocation`); requests must go to that region.
**Set** (image set): One uploaded image and everything stored for it: its sizes, its manifest and, usually, its original. Identified by `folder` and `name` (`SetIdentity`). _Avoid_: image, album, group.
**Set folder**: The folder named after a set, `{folder}/{name}/`, that holds all of the set's files (`setKeyPrefix`). The set's `folder` is the folder it sits in; its **destination** at upload time.
**Size**: One resized file of a set, named from the size table: `placeholder`, `thumbnail`, `small`, `medium`, `large`, `full` (smallest first). Stored as `{size}_{name}.webp`. Each has a longest-edge bound in pixels, and a smaller source is never upscaled. _Avoid_: variant in prose and UI; the code calls the same thing a variant (see Inconsistencies).
**Inline sizes**: `small`, `medium`, `large`: the ones a page shows inline; `full` is for a lightbox.
**Original**: The unchanged upload, kept private at `{folder}/{name}/original.{ext}` and used to remake sizes. Not a size, and the CDN must not serve it. Recorded as the manifest's `source`. _Avoid_: source image, in docs.
**Manifest**: A set's `manifest.json`, stored inside its set folder and written only after every size is stored, so a set exists if and only if its manifest does. Holds `schema`, `name`, `folder`, `status`, `createdAt`, `placeholder`, `source` and `variants`.
**Placeholder**: The 20px blurred copy of an image. It is both the `placeholder` size and the base64 data URI in the manifest's `placeholder` field (`null` when none could be made).
**Size status**: What a manifest says about one size (`SizeStatus`), with a `state`:
- `present`: the size is stored and plausible.
- `missing`: expected for this original but not stored; can be generated.
- `notApplicable`: the source is too small for this size.
- `mismatched`: the file is a copy of a smaller size, or smaller than its bound while a larger one exists.
**Generate missing sizes**: Remakes every `missing` size from the original, create-only, then rewrites the manifest. Needs an original.
**Upload status**: How each uploaded file ended: `stored`, `refused` (turned away by a rule, e.g. name taken, not an image, reserved path) or `failed` (unexpected error). One file's status never changes another's.
**Collection**: A named, ordered group of sets (`Collection`) with a unique `slug`, optional `cover`, `series` and `post`. A collection exists only while it has photos, and a set is in at most one.
**Photo**: A set's entry in a collection (`CollectionPhoto`): its `set` path plus `alt`, `caption` and `tags`.
**Collections file**: `gallery/collections.json` in a bucket, the source of truth for that bucket's collections. Each change copies the old file to `gallery/history/` and writes only if nobody wrote since (ETag match).
**Reserved prefix** (service prefix): `src/`, where only the service writes. Uploads to it, or into any folder named `original.…`, are refused, and the classifier never treats its keys as sets.
**Skipped key**: A bucket key that belongs to no set, with a reason: `reserved-prefix`, `folder-marker`, `set-manifest`, `not-webp`, `empty-name`, `no-set-folder`.
**Backfill**: The hand-run script that writes manifests (and records originals) for sets stored before uploads wrote their own; see `server/docs/runbooks/backfill-manifests.md`. Per-set outcomes: `written`, `exists`, `exists-stale`, `not-a-manifest`, `unreadable-object`, `failed`.
**Legacy set**: A set stored before manifests, or with no original or placeholder. Gaps are expected and shown calmly, never an error.

## Relationships

- A bucket holds many sets, one collections file and the reserved prefix.
- A set has one set folder, exactly one manifest, one entry per size (some `missing` or `notApplicable`) and at most one original.
- Every set has `full`; every other size is skipped when the original is smaller than its bound.
- A manifest's `source` describes the original; its `variants` describe the sizes.
- A collection holds many photos; each photo is one set; a set is in at most one collection.

## Inconsistencies

- Size vs variant: shared code says `Variant`, `IMAGE_VARIANTS`, `ImageVariant`, `manifest.variants`, `variantKey`; the size-status code and admin say "size" (`SizeStatus`, `sizeStatuses`, `generate-sizes`). They are the same thing; prefer "size" in prose.
- Original vs source: the file and docs say "original", the code says `source` (`manifest.source`, `ManifestSource`, `sourceKey`). `ImageSet.source` is a key or absent, `manifest.source` an object or `null`.
- Set vs image set: the code and docs use both for the same thing; `ImageSet` is the type, `SetIdentity` its name.
- Folder vs destination: an upload's `destination` becomes the set's `folder`; "set folder" is the set's own `{folder}/{name}/`.
- Sizes outside the table: manifest `variants` is a `Record<string, …>`, so names outside the current size table are kept.
