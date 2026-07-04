-- Public waiting list (in-person sessions currently full).
--
-- GDPR notes (see docs/DATA-RETENTION.md):
--  - Minimal data: name, email, optional phone. No health information.
--  - consent_at records WHEN explicit consent was given; the exact consent
--    wording lives with the form (versioned via consent_text).
--  - Entries are deleted from the dashboard (right to erasure) — hard delete,
--    no soft-delete copy. Stale entries should be purged after ~12 months.
--
-- Safe to re-run.

create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  email        text not null,
  phone        text,
  status       text not null default 'waiting',   -- 'waiting' | 'contacted'
  consent_at   timestamptz not null default now(),
  consent_text text not null,
  created_at   timestamptz not null default now(),
  contacted_at timestamptz
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

-- One live entry per email address — a double-submit updates nothing and the
-- form can tell the person they're already on the list.
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
grant all on public.waitlist to service_role;
