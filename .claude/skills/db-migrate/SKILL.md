---
name: db-migrate
description: Apply a supabase/migrations/*.sql file to production, or produce paste-ready SQL when no DB credentials exist. Use for every schema change - the repo and the production database drift otherwise (this caused the silent reminder outage).
---

# Apply a Supabase migration

Argument: path of the migration file (e.g. `supabase/migrations/foo.sql`).

## Writing rules (always, regardless of how it's applied)

- **Idempotent**: `create table/index if not exists`, `drop ... if exists`.
- **Existence-guarded**: never reference a table that may not exist in prod —
  the SQL editor runs a batch as ONE transaction, so a single 42P01 aborts
  everything. Wrap conditional parts in a `DO $$ ... to_regclass(...) $$` block
  that RAISEs NOTICEs for skipped parts.
- Every new table: `enable row level security` + `grant all ... to service_role`
  (default privileges now cover new tables, but be explicit).
- End with a small verification `select` the user/agent can run to confirm.

## Applying

If `SUPABASE_DB_URL` is set in the environment (add it in claude.ai/code
environment settings; value = Vercel's `POSTGRES_URL_NON_POOLING`):

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <file>   # after showing the user what will run
```

Show the file and get a one-line confirmation before executing; then run the
verification select and report.

If it is NOT set (or the network policy blocks port 5432): print the SQL in a
single fenced block for the user to paste into the Supabase SQL editor, tell
them what NOTICEs/result to expect, and ask them to report what it said.

## Never forget

Merging a PR does not touch the database. A feature that "doesn't save" in
prod almost always means its migration was never run.
