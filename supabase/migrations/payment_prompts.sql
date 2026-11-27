-- "Did they pay?" prompts. After a session ends, the app asks the practitioner
-- (never the client) whether it was paid, because most clients pay by Revolut
-- transfer to a personal account that no software can see.
--
-- One row per session. The hourly cron claims a row (bumping prompt_count)
-- BEFORE it emails the practitioner, so a session is prompted at most 5 times
-- and never twice in one run. snoozed_until holds "remind me tomorrow";
-- resolved_at / resolution record how the practitioner answered.
--
-- Safe to re-run.

create table if not exists public.payment_prompts (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null unique references public.sessions (id) on delete cascade,
  first_prompted_at timestamptz,
  last_prompted_at  timestamptz,
  prompt_count     int not null default 0,
  snoozed_until    timestamptz,
  resolved_at      timestamptz,
  resolution       text check (resolution in ('paid_receipt', 'paid_no_receipt', 'already_paid')),
  created_at       timestamptz not null default now()
);

-- Deny anon/authenticated access: only the service-role key (API routes)
-- touches this table, matching the rest of the schema.
alter table public.payment_prompts enable row level security;
grant all on public.payment_prompts to service_role;
