---
paths:
  - "client/**"
  - "server/**"
  - "shared/**"
---

# Where code lives: client, server or shared

Code starts in the app that uses it. Bespoke client or server code stays in `client/` or `server/`.

- When the client and the server both need the same type, constant or helper, move it to `shared/` and import it from both. One declaration, never a copy kept in step by hand.
- Before writing a helper, search `shared/` and the app's own services for one that already does it, and extend that.
- Move code into `shared/` the moment a second side needs it, not before.
