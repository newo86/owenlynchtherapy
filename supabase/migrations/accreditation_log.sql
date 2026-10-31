-- Accreditation log: supervision, CPD and personal-therapy hours that count
-- towards re-accreditation (IAHIP Bye Law 2B). Client hours are NOT stored
-- here; they are counted from the sessions table.
--
-- One row per thing done: a supervision session with Anne, a training day,
-- a block of personal therapy. `detail` holds the supervisor's name or the
-- course title. No client information is ever stored in this table.
--
-- Safe to re-run.

create table if not exists public.accreditation_log (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('supervision', 'cpd', 'own_therapy')),
  entry_date  date not null,
  hours       numeric(5, 2) not null default 1 check (hours > 0 and hours <= 24),
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists accreditation_log_kind_date_idx
  on public.accreditation_log (kind, entry_date desc);

alter table public.accreditation_log enable row level security;
grant all on public.accreditation_log to service_role;

-- Verify: the table exists with RLS on.
select relname, relrowsecurity from pg_class where oid = 'public.accreditation_log'::regclass;
