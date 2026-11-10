---
paths:
  - "server/src/**"
---

# Request parameters are parsed once

Every storage route reads `bucket` and `region` from the query through the one shared helper in `server/src/modules/storage/handlers/`, which answers 400 when either is missing. New routes use it too, so every route rejects a missing bucket with the same error shape.
