-- FIX: stop anyone with the anon key calling rate_limit_hit() directly.
--
-- rate_limit_hit is SECURITY DEFINER (it writes rate_limits, which RLS
-- otherwise denies). Postgres grants EXECUTE on new functions to PUBLIC, and
-- Supabase additionally grants it to anon/authenticated, so the function was
-- callable through the public REST API (/rest/v1/rpc/rate_limit_hit). An
-- attacker could fill the admin-login bucket for Owen's IP and lock him out,
-- or flood the table. Only the server (service_role) needs it.
-- Found by the security-guardian's first audit (docs/SECURITY.md,
-- "Database functions").
--
-- Safe to re-run; skips cleanly if rate_limits.sql was never applied.

do $$
begin
  if to_regprocedure('public.rate_limit_hit(text, integer, bigint)') is not null then
    revoke execute on function public.rate_limit_hit(text, int, bigint) from public, anon, authenticated;
    grant execute on function public.rate_limit_hit(text, int, bigint) to service_role;
    raise notice 'rate_limit_hit: EXECUTE revoked from public/anon/authenticated';
  else
    raise notice 'SKIPPED: rate_limit_hit does not exist (rate_limits.sql never applied)';
  end if;
end $$;

-- Verify: expect anon=false, authenticated=false, service_role=true.
select
  has_function_privilege('anon', 'public.rate_limit_hit(text, integer, bigint)', 'execute') as anon,
  has_function_privilege('authenticated', 'public.rate_limit_hit(text, integer, bigint)', 'execute') as authenticated,
  has_function_privilege('service_role', 'public.rate_limit_hit(text, integer, bigint)', 'execute') as service_role;
