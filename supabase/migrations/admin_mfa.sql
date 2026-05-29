-- Admin two-factor (TOTP) secret store. One row, owner = 'admin'. The secret is
-- written when the admin starts MFA setup (enabled = false) and flipped to
-- enabled = true once they confirm a code from their authenticator. Service-role
-- only (RLS denies anon/authenticated; the API routes use the service role).
--
-- Until MFA is enabled, admin login stays password-only — no lockout risk.

create table if not exists public.admin_mfa (
  owner      text primary key default 'admin',
  secret     text not null,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.admin_mfa enable row level security;
-- No policies for anon/authenticated => all access denied. service_role bypasses RLS.
grant all on public.admin_mfa to service_role;
