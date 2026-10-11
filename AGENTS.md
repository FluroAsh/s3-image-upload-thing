## Agent skills

### Issue tracker

Issues live in GitHub Issues (`FluroAsh/s3-image-upload-thing`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Server docs and scripts

`server/docs/` holds runbooks and diagrams for the server; see `server/docs/README.md` for its conventions. Code that only a hand-run script uses lives under `server/scripts/`, not `server/src/`. A script that a person runs gets a runbook in `server/docs/runbooks/`, and a change to the script updates its runbook in the same pull request.

### Branch and PR workflow

One ticket, one branch, one pull request.

1. **Pick a ticket.** Take an open issue labelled `ready-for-agent` that has no assignee and whose blockers are all either closed or have an open pull request (see step 3). Assign it to yourself before writing any code.
2. **Branch from `main`.** Unless step 3 applies, update `main`, then create the branch in a new git worktree so parallel work never shares a checkout. Name it `<issue-number>-<short-slug>`, for example `4-manifest-type-and-builder`.
3. **Stack dependent work.** If the ticket is blocked by one whose pull request is open but not merged, branch from that pull request's branch, not `main`, and open your pull request against that branch so the diff shows only your ticket. Then register the stack with the `gh stack` extension, listing the pull requests bottom to top: `gh stack link <blocker-pr> <your-pr>` (pass the existing stack's pull requests first when it already has more than one). Start the body with a stack line such as ``**Stack:** `main` ← #11 ← **#12** (this)``. If the blocker has no branch yet, stop and pick another ticket. Never rebase or force-push a branch that another open pull request is stacked on without restacking the ones above it.
4. **Verify before pushing.** Run the type check, the linter and the tests the change touches. Say plainly in the PR which acceptance criteria you could not verify.
5. **Open the PR.** Push the branch and open a pull request against `main` (or the branch it is stacked on) with `Closes #<issue-number>` in the body. Keep it to the one ticket.
6. **Stop there.** Never commit to `main` and never merge a pull request. A human reviews and merges.

Commits follow the Conventional Commits style already in the history.
