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
-- Safe to re-run (grants are idempotent).

GRANT ALL ON public.session_reminders TO service_role;
GRANT ALL ON public.payments          TO service_role;
GRANT ALL ON public.rate_limits       TO service_role;
GRANT ALL ON public.admin_mfa         TO service_role;

-- Future-proof: any table created from now on in public gets service_role
-- access automatically, so a forgotten grant can't silently disable a
-- feature again.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- Keep the deny-all posture for the public keys on the newer tables too.
ALTER TABLE public.session_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_mfa         ENABLE ROW LEVEL SECURITY;
