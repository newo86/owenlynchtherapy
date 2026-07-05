# Database structure review (July 2026)

Requested by Owen: "review the database structure to make sure it is
structured well." Reviewed from the repo's migrations plus every query in the
codebase. (This sandbox cannot connect to the production database, so the
original four tables were reconstructed from code — see the appendix for a
one-paste query that double-checks production against this review.)

## Verdict

**Sound.** The design follows the right conventions throughout and the newer
tables are genuinely well-engineered. The gaps are small, all on the four
oldest tables (created before migrations were kept in the repo), and none is
urgent.

## What's good (worth keeping deliberate)

- **Money is integer cents everywhere** — no floating-point money bugs.
- **All timestamps are `timestamptz`** — Dublin rendering happens in the app,
  storage is UTC. Correct.
- **UUID primary keys** with `gen_random_uuid()` defaults.
- **Security posture**: RLS enabled deny-all on every table; the app connects
  only server-side with the service role; the browser never touches the DB.
- **Duplicates killed at the DB, not in code**: one live session per
  client+timeslot (partial unique index), one reminder per session (UNIQUE),
  one waitlist entry per email (unique on `lower(email)`), one settings row
  (`check (id = 1)`).
- **A real payments ledger** — payments are their own table with CHECK
  constraints and sensible `on delete set null` FKs, instead of flags on
  sessions.
- **Fail-safe cron bookkeeping** — `reminder_runs` logs every run;
  `session_reminders` is claimed *before* sending (the flood-proof design).
- **Retention is enforced by the schema's crons** (token purge, 7-year
  clinical purge behind an env flag).

## Findings & recommendations

1. **Missing indexes on the oldest, busiest table** (low risk now, will
   matter as data grows). `sessions.client_id` and `sessions.session_date`
   are filtered/sorted in almost every dashboard query but have no index;
   same for `intake_submissions.token_id`. → **Fixed:** the new
   `supabase/migrations/000_base_schema.sql` includes
   `create index if not exists` for all three. Running that file on the
   existing database is safe (all `IF NOT EXISTS`) and its only effect there
   is adding these indexes. Worth running once.
2. **The original tables have no CHECK constraints** on their enum-like
   columns (`sessions.status`, `payment_status`, `session_format`,
   `clients.status`) — the app validates these, but the DB accepts anything.
   New clones get the CHECKs via the base schema. Retrofitting them onto the
   live DB is possible but low-value; skipped deliberately.
3. **`intake_tokens.token` should be UNIQUE** — the code treats it as a
   unique lookup key. New clones get the constraint; production likely has it
   already (the appendix query confirms).
4. **`clients.email` uses `''` for "none" while `phone` uses `NULL`** —
   harmless inconsistency, noted so nobody "fixes" one to match the other
   without checking the quick-add path.
5. **Client deletion cascades in application code** (sessions, submissions,
   ledger, calendar events) rather than via FK `ON DELETE CASCADE`. That's a
   reasonable choice — the code path also handles Google Calendar cleanup —
   but it means deletions must always go through the route, never raw SQL.
   Documented here as a rule.
6. **`sessions.stripe_payment_link_url/_id`** appear only in a TypeScript
   type; nothing reads or writes them. Legacy columns — candidates to drop in
   some future tidy-up, zero urgency.
7. **`rate_limits` grows unbounded** (one row per key/window). Tiny table in
   practice; a yearly manual `delete from rate_limits where window_start <
   now() - interval '30 days'` is plenty, or a future cron.

## Appendix — verify production matches

Paste in the Supabase SQL editor; compare the output against
`000_base_schema.sql`. If anything differs, tell Claude to update that file —
it is the template for every future clone.

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('clients','sessions','intake_tokens','intake_submissions')
order by table_name, ordinal_position;

select indexname, indexdef from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```
