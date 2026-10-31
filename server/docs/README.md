# Server docs

Documentation for the upload server and the scripts that live beside it. Keep it current: a change to a script or to how the server is structured updates the page that describes it, in the same pull request.

| Folder | Holds |
|---|---|
| `runbooks/` | Step-by-step procedures for things a person runs by hand, with what to expect at each step |
| `diagrams/` | SVG files the pages embed |
| `architecture/` | How the server is put together, as Mermaid diagrams in Markdown. Not written yet |

## Runbooks

- [Backfill manifests](runbooks/backfill-manifests.md): write manifests for image sets stored before uploads wrote their own

## Conventions

- One runbook per script, named after the script.
- Every runbook has: what it reads and writes, a numbered procedure, a table of expected results per step, a table of every outcome or error with what to do, and how to undo it.
- Placeholders such as `<primary-bucket>` and `<cdn-host>` stand in for real names. This repository is public; do not write real bucket names, hostnames or addresses here.
- Diagrams are SVG files in `diagrams/`, embedded with an image link and described in its alt text. Each carries a `<title>` and `<desc>`, and styles for light and dark.
- Architecture diagrams use Mermaid in a fenced block, so they can be read and edited as text.
