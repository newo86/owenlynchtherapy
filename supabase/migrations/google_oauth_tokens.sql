-- Stores a single OAuth token set for the practice's Google account.
-- Single-row table keyed by `owner = 'admin'`. The service role key is the only
-- thing that ever touches it; RLS is enabled and locked down so no anon access.

create table if not exists public.google_oauth_tokens (
  owner          text primary key,
  access_token   text        not null,
  refresh_token  text,
  scope          text,
  token_type     text,
  expiry_date    bigint,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.google_oauth_tokens enable row level security;

-- Deny everything by default. The service role bypasses RLS, so the admin
-- API routes (using SUPABASE_SERVICE_ROLE_KEY) still work.
drop policy if exists "no anon access" on public.google_oauth_tokens;
create policy "no anon access" on public.google_oauth_tokens
  for all
  to anon, authenticated
  using (false)
  with check (false);
