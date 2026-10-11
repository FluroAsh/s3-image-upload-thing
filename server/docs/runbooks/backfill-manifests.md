# Runbook: backfill manifests

Writes a manifest for every image set that was stored before uploads started writing their own. Run by hand from a checkout; it is not part of the deployed server.

- **Script:** `server/scripts/backfill-manifests.ts`, with its modules in `server/scripts/backfill/`
- **Reads:** one bucket per run (list and download only)
- **Writes:** one `.json` per image set, only under `manifests/` in the primary bucket, and only with `--write`
- **Safe to re-run:** yes. Existing manifests are left alone unless `--force` is given

## What it touches

![The script lists and downloads from the bucket it reads and writes manifests only under manifests/ in the primary bucket](../diagrams/backfill-data-flow.svg)

The **primary bucket** is the one uploads go to and the only one the CDN serves `manifests/` from. A **second bucket** is any other bucket published under a path prefix on the same CDN host (for example `legacy/`). Its manifests are stored in the primary bucket, at `manifests/<path-prefix>...`. The script never writes to a second bucket and never writes to an image key in either.

## Before you start

| Need | Why |
|---|---|
| `server/.env` with credentials that can list and read both buckets and write to the primary one | The script uses the server's own S3 client |
| The region of the buckets, if it is not the server default | Passed as `--region`; one region covers both buckets |
| The name of the primary bucket and of the bucket you are reading | They are arguments; nothing is hard-coded |
| A dry run you have read | A write run does not repeat the dry run's findings |

All commands run from `server/`.

## Procedure

Work through these in order. Stop at the first step whose result is not the expected one.

### 1. Dry run

```bash
bun --env-file=.env scripts/backfill-manifests.ts --bucket <read-bucket> [--prefix <folder>]
```

For a second bucket add `--path-prefix <prefix>/` so manifest paths and collisions are computed where they will really land.

| Line in the report | Expect | If not |
|---|---|---|
| `Keys listed` | Matches `aws s3 ls s3://<read-bucket>/<folder> --recursive \| wc -l` | The listing is incomplete; check credentials and region |
| `Image sets` by layout | Nested sets for the primary bucket, flat sets for a second bucket | A mix means two layouts share the bucket; read the per-set lines before writing |
| `Skipped keys` | Only files that are not images, folder markers, and anything under `manifests/` or `src/` | An image you expected to see is listed here with the reason it was skipped |
| `Sets where two variant names share an ETag` | Informational. Older uploads stored one file under several names | Nothing to do; the manifest records what is there |
| `Sets missing medium or large` | Zero, or sets you know are small | Those sets get a manifest without those sizes |
| `Manifest key collisions` | Zero | Do not write. Two sets would share one manifest; rename or remove one first |
| `Sets with jpg/jpeg/png members` | Informational. They are not WebP, so they get no manifest | Nothing to do |

### 2. Write one folder

```bash
bun --env-file=.env scripts/backfill-manifests.ts \
  --bucket <primary-bucket> --manifest-bucket <primary-bucket> --path-prefix "" \
  --prefix <folder> --write
```

A second bucket's sets sit at its root, so `--prefix` cannot narrow that run. Do the one-folder trial on the primary bucket.

Expect one line per set as it finishes, then totals:

```
[written] nested trip/photo -> manifests/trip/photo.json
...
Sets found: 12
Written: 12
Skipped: 0
Failed: 0
```

### 3. Check what was written

| Check | Command | Expect |
|---|---|---|
| Count | `aws s3 ls s3://<primary-bucket>/manifests/<folder>/ --recursive \| wc -l` | Equals `Written` |
| Headers | `aws s3api head-object --bucket <primary-bucket> --key manifests/<folder>/<name>.json` | `ContentType` `application/json`, `CacheControl` `public, max-age=300` |
| Through the CDN | `curl -sI https://<cdn-host>/manifests/<folder>/<name>.json` | `200`, `content-type: application/json` |
| Contents | `curl -s https://<cdn-host>/manifests/<folder>/<name>.json` | Every `variants.*.key` exists in the bucket with the same size; `width` and `height` match a file you open |
| Nothing else changed | `aws s3 ls s3://<primary-bucket>/<folder>/ --recursive` before and after | Identical |

### 4. Write everything

Primary bucket:

```bash
bun --env-file=.env scripts/backfill-manifests.ts \
  --bucket <primary-bucket> --manifest-bucket <primary-bucket> --path-prefix "" --write
```

Second bucket:

```bash
bun --env-file=.env scripts/backfill-manifests.ts \
  --bucket <second-bucket> --manifest-bucket <primary-bucket> --path-prefix <prefix>/ --write
```

The folder from step 2 shows as `exists`. `Failed: 0` and exit code `0` mean every set that should have a manifest has one.

## Arguments the script refuses

Each of these exits with code `1` before any request is made, and prints the usage text.

| You ran | It says | Why it is refused |
|---|---|---|
| No `--bucket` | `--bucket is required` | Nothing to read |
| `--write` without `--manifest-bucket` | `--write needs --manifest-bucket` | Where manifests go is never guessed |
| `--write` without `--path-prefix` | `--write needs --path-prefix, even when it is empty` | A forgotten prefix on a second bucket would store its manifests in the primary bucket's paths |
| `--path-prefix legacy/` with `--manifest-bucket` equal to `--bucket` | `...marks a second bucket, whose manifests belong in the primary bucket` | The CDN only serves `manifests/` from the primary bucket |
| `--path-prefix /`, `legacy`, `a//b/`, `../x/` | A message naming the bad prefix | It must be empty or clean segments each ending in one `/` |
| `--prefix /` or an empty `--prefix` | `--prefix must name a folder without a leading "/"` | It would list nothing and look like a clean run |
| `--force` without `--write` | `--force only applies with --write` | A dry run replaces nothing |
| An unknown flag | The parser's error | Typos must not be ignored |

## Runs that stop early

| Situation | It says | Exit code |
|---|---|---|
| The bucket or folder has no keys | `No keys found in ...; nothing was written` | `1` |
| Keys exist but none form an image set | `No image sets in ...` | `1` |
| Credentials missing from the environment | The server's missing-keys error | `1` |

## What can happen to one set

![Decision flow from collision check, to existing manifest check, to written, skipped or failed outcomes](../diagrams/backfill-set-outcomes.svg)

| Outcome | Counts as | What it means | What to do |
|---|---|---|---|
| `written` | Written | The manifest was stored. A detail such as `lossless holds jpeg, not webp` means a file's bytes do not match its name; the manifest records the real format | Nothing |
| `exists` | Skipped | The set already has a manifest listing exactly its current files | Nothing |
| `exists-stale` | Skipped | The set has a manifest, but a size has been added or removed since. The line lists which keys | Re-run with `--force` to refresh it |
| `exists-other-set` | Failed | The manifest at that path is for a different layout or bucket. It is never replaced, even with `--force` | Work out which set should own the path; remove the other set or its manifest by hand, then re-run |
| `collision` | Failed | Two sets in this run map to the same manifest path. Neither is written | Rename or remove one of the sets |
| `unreadable-object` | Failed | An object could not be downloaded or is not an image, or its size differs from the listing | Check the key named in the line; re-run once it is fixed or removed |
| `failed` | Failed | Any other error for that set, including a request that timed out after 60 seconds | Read the message; re-run |

Any `Failed` count above zero makes the exit code `1`. Skips do not.

## When something goes wrong

| Symptom | Likely cause | Action |
|---|---|---|
| The run was interrupted | Closed terminal, lost network | Re-run the same command. Sets already written show as `exists` |
| Many `failed` lines mentioning a timeout | Slow or dropped connection | Re-run; only the failed sets are attempted again |
| `exists-stale` on sets you did not touch | Files were added or removed in the bucket after the last backfill | Re-run with `--force` |
| A manifest is wrong | The set changed, or it was written by an older version | Re-run with `--force` and `--prefix <folder>` |
| The CDN still serves an old manifest | Manifests are cached for five minutes | Wait, or invalidate `/manifests/*` on the CDN |
| You need to undo a run | | Delete only what that run wrote: `aws s3 rm s3://<primary-bucket>/manifests/<folder>/ --recursive`. Do not delete all of `manifests/` once uploads are live, because uploads store their manifests there too |

Removing a manifest is always safe for images: nothing but the manifest is deleted, and a consumer that finds no manifest falls back to its own behaviour.

## Limits

- Every object is downloaded whole, four sets at a time. This suits buckets of a few thousand images; a much larger bucket needs ranged reads first.
- One `--region` is used for both buckets.
- Only `.webp` files are grouped into sets. A set whose original is a `.jpg` or `.png` gets no manifest.
