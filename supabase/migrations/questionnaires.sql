-- Client questionnaires: the "Finding your values" ACT worksheet and the
-- C–NIP–2 (Cooper–Norcross Inventory of Preferences). Owen sends a private,
-- single-use link from the dashboard (Analytics); the client completes it on
-- the public site; answers and computed scores are stored here and shown in
-- the dashboard. A client can be sent the same questionnaire many times
-- (e.g. C–NIP–2 at intake, session 5 and session 10): every completion is its
-- own row, so results can be compared over time.
--
-- Deleting a client deletes their links and responses (on delete cascade).
-- Safe to re-run.

create table if not exists public.questionnaire_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  client_id   uuid not null references public.clients(id) on delete cascade,
  kind        text not null check (kind in ('values', 'cnip')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  emailed_at  timestamptz
);

create index if not exists questionnaire_tokens_client_idx
  on public.questionnaire_tokens (client_id, created_at desc);

create table if not exists public.questionnaire_responses (
  id           uuid primary key default gen_random_uuid(),
  token_id     uuid not null unique references public.questionnaire_tokens(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  kind         text not null check (kind in ('values', 'cnip')),
  answers      jsonb not null,
  scores       jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists questionnaire_responses_client_idx
  on public.questionnaire_responses (client_id, kind, submitted_at desc);

-- Server-only access (service role), like every other table. RLS on with no
-- policies means the anon/public key can read or write nothing.
alter table public.questionnaire_tokens enable row level security;
alter table public.questionnaire_responses enable row level security;
grant all on table public.questionnaire_tokens to service_role;
grant all on table public.questionnaire_responses to service_role;

-- Verify: expect two rows, both with rls = true.
select c.relname as table, c.relrowsecurity as rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('questionnaire_tokens', 'questionnaire_responses')
order by 1;
