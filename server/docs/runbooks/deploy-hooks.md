# Runbook: deploy hooks

Redeploys the sites that read a bucket when the bucket changes. The server keeps each bucket's hooks in a settings file and calls them after writes. Nothing here is run by a script; this page covers where the data lives and how to look after it.

- **Code:** `server/src/modules/settings/`
- **Reads and writes:** one JSON settings file, `SETTINGS_PATH` (default `/data/settings.json`), on the `s3-image-upload-thing_s3-upload-settings` Docker volume
- **Calls:** each hook URL, with an empty `POST`
- **Safe to re-run:** yes. Pressing Deploy now twice just calls the hooks twice

## What it touches

![A successful write restarts the bucket's in-memory countdown; after two minutes without another write, or on Deploy now, the server reads the hook URLs from the settings file on the data volume and POSTs to each, so the sites rebuild](../diagrams/deploy-hooks-flow.svg)

- Every successful write the tool makes to a bucket restarts that bucket's countdown: uploads, size generation, attaching an original, and all collection writes. Reads, including requests for presigned URLs, never do.
- The hook fires once, two minutes after the last write. The countdown and each hook's last result live in memory only: a server restart drops a pending deploy, and Deploy now covers that.
- A failed call (a non-2xx answer, a timeout or a network error) is logged with the hook's name and shown as its last result. There are no retries.
- Hook URLs must be `https`; outside production (`NODE_ENV` is not `production`) plain `http://localhost` is also allowed, so a local request catcher can stand in for a site. They are stored in the settings file as plain text, and the routes only ever return the host and the last 4 characters.

## Settings file

| Item | Value |
|---|---|
| Path in the container | `/data/settings.json`, or `SETTINGS_PATH` |
| Volume | `s3-image-upload-thing_s3-upload-settings`: `docker-compose.yml` declares `s3-upload-settings`, and Compose prefixes the project name. Mounted at `/data` |
| Shape | `{ "buckets": { "<bucket>": { "hooks": [{ "id", "name", "url" }] } } }` |
| Missing file | Read as no hooks; the first save creates it |
| Write | To `settings.json.tmp`, then renamed into place |
| Mode | `0600`, owned by the `bun` user |

The deploy workflow's `down` and `build` keep named volumes, so the file survives a redeploy. `docker compose down -v` deletes it.

## Procedures

The file holds secret URLs: never `cat` it, paste it into a ticket or commit a copy. Stop at the first step whose result is not the expected one.

### Inspect it

Prints only each hook's name and host.

1. Run:

   ```bash
   docker exec s3-upload-server bun -e '
   const s = await Bun.file(process.env.SETTINGS_PATH ?? "/data/settings.json").json();
   for (const [bucket, { hooks }] of Object.entries(s.buckets))
     console.log(bucket, hooks.map((h) => `${h.name} ${new URL(h.url).host}`));'
   ```

2. Read the output.

| Output | Meaning | If not |
|---|---|---|
| One line per bucket with hook names and hosts | The file is readable and valid | A parse error means the file is damaged: restore it from a backup |
| `ENOENT` | No hook has been saved yet | Nothing to do |
| `EACCES` | The volume is not writable by the `bun` user | See the problems table |

### Back it up

Copy the file out of the volume into a private location, and keep the copy as private as the URLs themselves.

1. Copy it out:

   ```bash
   docker cp s3-upload-server:/data/settings.json ./settings.backup.json
   ```

2. Restrict it:

   ```bash
   chmod 600 ./settings.backup.json
   ```

| Step | Expect | If not |
|---|---|---|
| 1 | No output, and `settings.backup.json` exists | `No such container:path` means no hook has been saved yet: there is nothing to back up |
| 2 | No output; `ls -l` shows `-rw-------` | Run it again from the folder that holds the copy |

### Restore it

Replaces the settings file with a backup. Hooks added since the backup are lost.

1. Copy the backup in:

   ```bash
   docker cp ./settings.backup.json s3-upload-server:/data/settings.json
   ```

2. Give the file back to the server's user, since the copy arrives owned by root:

   ```bash
   docker exec -u root s3-upload-server chown bun:bun /data/settings.json
   ```

3. Restart the server, which drops any pending deploy:

   ```bash
   docker restart s3-upload-server
   ```

4. Run the inspect procedure above.

| Step | Expect | If not |
|---|---|---|
| 1 | No output | `No such container` means the server is not running: start it first |
| 2 | No output | Saving a hook will answer 500 with `EACCES` until this has run |
| 3 | The container name is printed | Check `docker logs s3-upload-server` |
| 4 | The bucket and hook names you expect | A parse error means the backup is damaged: use an older one |

## Problems

| Symptom | Cause | What to do |
|---|---|---|
| Saving a hook answers 500 and the log shows `EACCES` | The volume was created owned by root | `docker exec -u root s3-upload-server chown bun:bun /data` |
| Listing or saving hooks answers 500 `Settings file is not valid JSON` | The file is damaged | Restore a backup |
| A hook shows a red result with status 0 | The call timed out after 10 s or could not connect | Press Test; check the site's hook is still enabled |
| A hook shows a red result with a 4xx status | The URL was revoked or regenerated | Replace its URL in the settings page (#121) |
| A pending deploy vanished | The server restarted | Press Deploy now |
| The settings file is lost | The volume was removed | Add the hooks again, or restore the backup |

## Undo

- To stop a hook firing, delete it in the settings page (#121), or remove its entry from the file with the server stopped.
- To remove everything, delete the file and restart: the server reads a missing file as no hooks.

## Follow-up

Moving the URLs into AWS SSM Parameter Store is tracked in #130.
