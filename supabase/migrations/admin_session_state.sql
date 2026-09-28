-- Server-side revocation for admin logins.
--
-- Admin session cookies are stateless (a signed expiry), so logging out used
-- to only delete the cookie from that browser — a copied cookie kept working
-- for up to 12 hours. Now "Sign out" stamps valid_after = now(), and every
-- cookie issued before that moment is rejected, on every device.
--
-- Single row (id = 1). Until this table exists the app behaves exactly as
-- before (no revocation), so running it late is harmless.
--
-- Safe to re-run.

create table if not exists public.admin_session_state (
  id          int primary key default 1 check (id = 1),
  valid_after timestamptz not null default 'epoch',
  updated_at  timestamptz not null default now()
);

insert into public.admin_session_state (id) values (1)
on conflict (id) do nothing;

alter table public.admin_session_state enable row level security;
grant all on public.admin_session_state to service_role;

-- Verify: expect one row, id = 1, valid_after = 1970-01-01 (nothing revoked yet).
select id, valid_after, updated_at from public.admin_session_state;
