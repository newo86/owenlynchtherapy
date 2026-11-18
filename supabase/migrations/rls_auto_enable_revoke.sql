-- Lock down public.rls_auto_enable().
--
-- This SECURITY DEFINER function is fired by the `ensure_rls` event trigger
-- (ddl_command_end) and switches on Row Level Security for every new table in
-- `public` — a safety net worth keeping. It was created in the Supabase
-- dashboard (not by a migration) with default privileges, so Supabase's
-- security advisor flagged it as callable by `anon` and `authenticated` via
-- /rest/v1/rpc/rls_auto_enable. A direct call can't do anything (an
-- event-trigger function errors unless fired by its trigger), but nothing
-- outside the database should be able to call it.
--
-- Revoking EXECUTE does not stop the event trigger: event triggers fire their
-- function without an EXECUTE check on the caller.
--
-- For new practices 000_rls_auto_enable.sql now creates the function and
-- trigger with this revoke already in place, so this file is a no-op there;
-- it stays for the original practice's history.
--
-- Existence-guarded and safe to re-run.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
    raise notice 'revoked EXECUTE on public.rls_auto_enable() from public, anon, authenticated';
  else
    raise notice 'SKIPPED: public.rls_auto_enable() does not exist';
  end if;
end $$;

-- Verify: expect anon = false, authenticated = false (no row if the function
-- doesn't exist, e.g. on a fresh clone of the template).
select
  has_function_privilege('anon', p.oid, 'execute') as anon,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated
from (select to_regprocedure('public.rls_auto_enable()') as oid) p
where p.oid is not null;
