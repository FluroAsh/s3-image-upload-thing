---
paths:
  - "client/**"
---

# Admin state follows the active bucket

The URL search params (`bucket`, `region`) are the source of truth for which bucket is active.

- **Transient state is reset when its context ends.** Closing a modal returns it to its first screen and clears its selections; switching buckets clears the active file or set and any open detail views.
- **Bucket-scoped queries run only for the active bucket.** Read the bucket from the URL-param state, put the bucket name in the query key, and gate the query with `enabled` until a bucket is present.
- Mutations invalidate only the active bucket's keys.
