-- FOLLOWED FROM GOOGLE: a record of every change the app copied from Google
-- Calendar by itself (27 Nov 2026, src/lib/followGoogle.ts).
--
-- Owen edits his diary in Google ("when I delete in Google Calendar it doesn't
-- update in my dashboard, or I change things to every two weeks and it
-- doesn't update"). So the 5-minute calendar job now follows three kinds of
-- change to sessions tied to Google BY ID (never by name), future scheduled
-- sessions only:
--   cancelled_occurrence  one occurrence deleted in Google → session cancelled
--   series_ended          a repeating series deleted / ended in Google →
--                         its later sessions cancelled, the series switched off
--   interval_changed      the repeat changed weekly ↔ every N weeks → the
--                         series' interval follows
-- Each row holds what it changed (`before`) and the result (`after`), so the
-- dashboard's "Followed from Google" card can undo it for 7 days. An undone
-- row (undone_at set) also tells the job never to follow that change again.
-- Until this table exists the job follows nothing.
--
-- Safe to re-run.

create table if not exists public.calendar_followed_changes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete cascade,
  series_id   uuid references public.session_series (id) on delete cascade,
  kind        text not null check (kind in ('cancelled_occurrence', 'series_ended', 'interval_changed')),
  before      jsonb not null default '{}'::jsonb,
  after       jsonb not null default '{}'::jsonb,
  applied_at  timestamptz not null default now(),
  undone_at   timestamptz
);

create index if not exists calendar_followed_changes_applied_idx
  on public.calendar_followed_changes (applied_at desc);

-- Deny anon/authenticated access: only the service-role key (API routes)
-- touches this table, matching the rest of the schema.
alter table public.calendar_followed_changes enable row level security;
grant all on public.calendar_followed_changes to service_role;
