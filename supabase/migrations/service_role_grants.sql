-- FIX: missing service_role grants on newer tables.
--
-- supabase-rls-policy.sql granted service_role access to the five original
-- tables only. Tables added later (session_reminders, payments, rate_limits,
-- admin_mfa) never received grants, and in this project default privileges
-- do not cover them. Confirmed impact in production (July 2026): every
-- automatic reminder-cron send failed fail-closed with
--   "permission denied for table session_reminders"
-- while manual sends (which log their claim best-effort AFTER sending)
-- kept working — i.e. auto-reminders silently down.
--
-- The same missing grant is masked elsewhere by fail-safes:
--   - rate_limits: durable rate limiter fails OPEN on error (silently inactive)
--   - admin_mfa: isMfaEnabled() fails to "disabled" on error
--   - payments: ledger inserts from mark-paid / Stripe webhook error
--
-- Written as a DO block so it works even when some of these tables were
-- never created (e.g. admin_mfa doesn't exist until admin_mfa.sql is run —
-- a plain GRANT would abort the whole batch with 42P01). Check the NOTICE
-- output: any "skipped" table means its own migration was never applied.
--
-- Safe to re-run (grants are idempotent).

do $$
declare
  t text;
begin
  foreach t in array array['session_reminders', 'payments', 'rate_limits', 'admin_mfa'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant all on table public.%I to service_role', t);
      execute format('alter table public.%I enable row level security', t);
      raise notice 'granted + RLS enabled: %', t;
    else
      raise notice 'SKIPPED — table does not exist (its migration was never run): %', t;
    end if;
  end loop;
end $$;

-- Future-proof: any table created from now on in public gets service_role
-- access automatically, so a forgotten grant can't silently disable a
-- feature again.
alter default privileges in schema public grant all on tables to service_role;
