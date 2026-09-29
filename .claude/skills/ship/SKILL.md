---
name: ship
description: Commit, push, open a PR, wait for the checks by polling (never sleep-guess), merge on green, and confirm the production deploy. Use whenever changes are ready to go live.
---

# Ship the working tree to production

Goal: the change is live on owenlynchtherapy.com and you can say so plainly.
The repo squash-merges PRs into `main`, and Vercel auto-deploys `main`.

Done looks like: PR merged, the newest production deployment for the merge
commit is `READY`, and the user has a one-line report — plus a note to run
any new migration (step 7).

1. **Restart the branch from main** unless it holds unmerged commits:
   `git fetch origin main && git checkout -B <working-branch> origin/main`.
   *Why: every squash merge orphans the working branch's history; building on
   it produces conflicts and re-shipped commits.*
2. **Gate** with the `check` skill; don't ship red. For a visible UI change,
   run the `preview` skill first and ship only once the user has approved the
   screenshot. *Why: one day produced six commits of hero-typography rework
   and three rounds on one dashboard banner — a screenshot first avoids that.*
3. Commit with a descriptive message, then
   `git push --force-with-lease -u origin <branch>` (safe here: the remote
   branch only ever holds already-merged history).
4. Open the PR with the github MCP `create_pull_request`, base `main`.
5. **Poll the checks** with `pull_request_read` → `get_check_runs` until they
   finish (a few minutes at most); don't guess with a long sleep. Green means
   `verify` (GitHub Actions: typecheck + tests) and "Vercel Preview Comments"
   are `success`; "Supabase Preview" is normally `skipped`.
6. Merge with `merge_pull_request`, `merge_method: "squash"`, then confirm
   with the Vercel MCP `list_deployments` that the newest
   `target: "production"` deployment for the merge commit is `READY`.
7. If the PR added a file in `supabase/migrations/`, the database still needs
   it: apply it with the `db-migrate` skill or tell the user to.
