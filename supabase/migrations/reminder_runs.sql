-- Log of every automatic reminder run (Phase 1 observability).
--
-- One row per invocation of /api/admin/reminders/run, whatever the outcome —
-- including aborts and the kill switch. The dashboard health strip reads the
-- latest row so "did this morning's reminders go out?" is answerable at a
-- glance instead of by reading Vercel logs. Motivated by the July 2026
-- incident where every run failed silently for days.
--
-- Safe to re-run.

create table if not exists public.reminder_runs (
  id         uuid primary key default gen_random_uuid(),
  ran_at     timestamptz not null default now(),
  outcome    text not null,          -- 'completed' | 'aborted:<reason>' | 'error:<reason>'
  candidates int not null default 0,
  sent       int not null default 0,
  skipped    int not null default 0,
  failed     int not null default 0,
  detail     jsonb                   -- per-session outcomes / abort message
);

create index if not exists reminder_runs_ran_at_idx
  on public.reminder_runs (ran_at desc);

alter table public.reminder_runs enable row level security;
grant all on public.reminder_runs to service_role;
