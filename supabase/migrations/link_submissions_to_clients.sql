-- Links intake_tokens and intake_submissions back to their owning client row.
-- Without this, downloading an intake PDF from the Clients tab was guessing
-- by email — and any two test clients sharing an email mix up.
--
-- Safe to re-run.

alter table public.intake_tokens
  add column if not exists client_id uuid references public.clients(id);

alter table public.intake_submissions
  add column if not exists client_id uuid references public.clients(id);

-- Backfill existing rows: a token and its client were created in the same
-- generate-token call, within milliseconds of each other. Match on email +
-- name + created_at proximity (60s tolerance to be safe).

update public.intake_tokens t
set client_id = c.id
from public.clients c
where t.client_id is null
  and t.client_email = c.email
  and t.client_name = c.full_name
  and abs(extract(epoch from (t.created_at - c.created_at))) < 60;

-- Submissions inherit client_id from their token.

update public.intake_submissions s
set client_id = t.client_id
from public.intake_tokens t
where s.client_id is null
  and s.token_id = t.id
  and t.client_id is not null;
