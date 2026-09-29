---
name: db-migrate
description: Apply a supabase/migrations/*.sql file to production, or produce paste-ready SQL when no DB credentials exist. Use for every schema change - the repo and the production database drift otherwise (this caused the silent reminder outage).
---

# Apply a Supabase migration

Goal: production's schema matches the repo, confirmed by a query rather than
assumed. Done when the verification `select` has run (by you or the user)
and shows the expected result.

Argument: path of the migration file (e.g. `supabase/migrations/foo.sql`).
For the current schema, see `supabase/migrations/` and `docs/DB-REVIEW.md`.

## Writing the SQL

- **Idempotent**: `create table/index if not exists`, `drop ... if exists`.
  *Why: production can lag or run ahead of the repo, so the same file may
  meet different states.*
- **Existence-guarded**: never reference a table that may not exist in prod.
  Wrap conditional parts in a `DO $$ ... to_regclass(...) $$` block that
  raises NOTICEs for skipped parts. *Why: the SQL editor runs a batch as one
  transaction, so a single 42P01 aborts everything.*
- Every new table gets `enable row level security` and
  `grant all ... to service_role`. Default privileges cover new tables now,
  but being explicit survives a changed default.
- End with a small verification `select` that confirms the change.

## Applying

If `SUPABASE_DB_URL` is set in the environment (value = Vercel's
`POSTGRES_URL_NON_POOLING`, added in the claude.ai/code environment settings),
show the user the file and get a one-line confirmation, then:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <file>
```

Then run the verification select and report. *Why confirm first: this writes
to the live database that holds client records.*

If it isn't set, or the network policy blocks port 5432, print the SQL in a
single fenced block for the user to paste into the Supabase SQL editor, say
what NOTICEs and result to expect, and ask them to report what it said.
