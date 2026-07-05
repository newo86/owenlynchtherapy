-- Practice settings (Platform plan, Phase 1).
--
-- One row of editable practice configuration, managed from the dashboard's
-- Settings page. The app deep-merges this over the code defaults in
-- src/practice.config.ts, so an empty/missing row means "use the defaults"
-- and a fresh clone works before anything is filled in.
--
-- Single-row table: id is constrained to 1. Data is one jsonb document so
-- adding settings fields never needs another migration.
--
-- Safe to re-run.

create table if not exists public.practice_settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.practice_settings enable row level security;
grant all on public.practice_settings to service_role;
