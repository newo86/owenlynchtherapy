-- GOOGLE CALENDAR LEADS (27 Nov 2026): a record of every change the sync job
-- makes to the app because of Google Calendar (src/lib/googleTruth.ts):
-- sessions added, moved or cancelled, and "held" when too many disappeared
-- from Google at once to cancel safely. Shown on the dashboard for the last
-- week. Names/times only; no clinical content.
--
-- Safe to re-run.

create table if not exists public.calendar_sync_log (
  id         uuid primary key default gen_random_uuid(),
  at         timestamptz not null default now(),
  action     text not null check (action in ('added', 'moved', 'cancelled', 'held')),
  client_id  uuid references public.clients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  detail     text not null
);

create index if not exists calendar_sync_log_at_idx on public.calendar_sync_log (at desc);

alter table public.calendar_sync_log enable row level security;
grant all on public.calendar_sync_log to service_role;

select count(*) as rows_in_calendar_sync_log from public.calendar_sync_log;
