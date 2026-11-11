# Context

A guide to the domain, not a reference: the code is the source of truth, so check names and values there.

An image upload service and its admin. Each uploaded image is stored in an S3 bucket as a set of resized files plus a manifest, and sets are grouped into collections for a portfolio site.

## Concepts

**Bucket**: An S3 bucket the service reads and writes; requests name it with its region (a bucket location).
**Set**: One uploaded image and everything stored for it, in its own set folder `{folder}/{name}/`. _Avoid_: album, group.
**Size**: One resized copy of a set's image, from a fixed table running from a tiny placeholder up to `full`. A smaller image is never upscaled, so some sizes may not apply. The code also calls these variants (#93).
**Original**: The unchanged upload, kept private beside the sizes and used to remake them. Never served by the CDN. The code calls it the source (#93).
**Manifest**: A set's `manifest.json`, written last, so a set exists once its manifest does. It describes the sizes and the original.
**Size status**: Whether each size of a set is present, missing, not applicable, or mismatched. Missing sizes can be generated from the original.
**Collection**: A named, ordered group of sets for the portfolio, stored per bucket in `gallery/collections.json`.
**Reserved prefix**: A path only the service writes to; never treated as sets.
**Legacy set**: A set stored before manifests, or without an original or placeholder.

## Relationships

- A bucket holds many sets and one collections file.
- A set has one manifest, several sizes and at most one original.
- A set is in at most one collection.

## Principles

- Legacy gaps are expected: show them calmly, never fail on them. Repairs are separate, deliberate jobs.
- Writes that could clash are create-only or conditional, so a race fails rather than overwrites.
- A single operator runs the admin on a private network; rare concurrent edits are not designed for.
