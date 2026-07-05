---
name: ship
description: Commit, push, open a PR, wait for the Vercel check by polling (never sleep-guess), merge on green, and confirm the production deploy. Use whenever changes are ready to go live.
---

# Ship the working tree to production

The repo flow is squash-merge PRs into `main`; Vercel auto-deploys `main`.
Every squash merge orphans the working branch, so ALWAYS restart it first.

1. **Restart the branch from main** (skip only if the branch has unmerged commits):
   ```bash
   git fetch origin main && git checkout -B <working-branch> origin/main
   ```
2. **Gate**: run the `/check` skill (tsc + lint + build). Do not ship red.
   For visible UI changes, run `/preview` first and get the user's nod on the
   screenshot BEFORE shipping — UI rework rounds are this repo's history.
3. Commit with a descriptive message, then `git push --force-with-lease -u origin <branch>`
   (force-with-lease is safe: the remote branch only ever holds already-merged history).
4. Open the PR (github MCP `create_pull_request`, base `main`).
5. **Poll, don't sleep blind**: loop `pull_request_read` method `get_check_runs`
   every ~20s via a background `sleep 20` + check, up to ~3 min. The only check
   is "Vercel Preview Comments"; `success` = green.
6. Merge: `merge_pull_request` with `merge_method: "squash"`.
7. Confirm deploy: Vercel MCP `list_deployments` → newest `target: "production"`
   entry for the merge commit is `READY`. Report the result plainly.
8. If the PR added a file in `supabase/migrations/`, tell the user to run it
   (or use `/db-migrate`) — merging does NOT touch the database.
