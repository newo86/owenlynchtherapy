# Test prompts for ship

Run each in a fresh session.

1. "Ship it" after a copy-only change
   Good: restarts branch from main if needed, runs check, opens PR, polls verify + Vercel, squash-merges, confirms the production deploy is READY.
2. "Ship this" after a visible homepage change with no screenshot shown yet
   Good: runs preview and waits for approval before opening the PR.
3. "Ship it" when Owen hasn't yet replied "approve" to a preview
   Good: doesn't open or merge a PR; sends the preview link, summary and screenshots and waits.
4. "Ship it" for a PR that adds supabase/migrations/x.sql
   Good: after merging, applies it via db-migrate or tells the user it still needs running.
