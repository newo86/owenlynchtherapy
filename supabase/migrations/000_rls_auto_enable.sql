-- SAFETY NET: switch on Row Level Security for every new table in `public`.
--
-- Run SECOND, straight after 000_base_schema.sql (it sorts there by name), so
-- every table created by the later migrations is caught.
--
-- Every migration in this folder already enables RLS on the tables it creates.
-- This is the backstop for the day one forgets: without RLS, a table in
-- `public` is readable and writable through the public (anon) API key, which
-- for this app would mean client records. An event trigger (`ensure_rls`)
-- fires after each CREATE TABLE and enables RLS on any new `public` table.
--
-- The function runs as its owner (SECURITY DEFINER) with a pinned
-- search_path, and nobody else may call it: EXECUTE is revoked from public,
-- anon and authenticated (Supabase advisor lints 0028/0029). Event triggers
-- fire their function without an EXECUTE check, so the revoke doesn't stop it.
--
-- Matches the original practice's production database, where this was first
-- set up in the Supabase dashboard (see also rls_auto_enable_revoke.sql).
--
-- Idempotent: CREATE OR REPLACE keeps the function's existing grants, and the
-- event trigger is only created when missing. Safe to re-run (run it as
-- `postgres`, the function's owner — the SQL editor and CLI both do).

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          -- A WARNING (not just a log line) so it shows in the SQL editor:
          -- a table this couldn't lock is open until someone fixes it.
          raise warning 'rls_auto_enable: FAILED to enable RLS on % (%): enable it by hand', cmd.object_identity, sqlerrm;
      end;
    else
      raise log 'rls_auto_enable: skip % (schema % not enforced)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
    raise notice 'created event trigger ensure_rls';
  else
    raise notice 'event trigger ensure_rls already exists: left as is';
  end if;
end $$;

-- Verify: expect trigger_enabled = 'O' (on), anon_can_execute = false.
select
  (select evtenabled from pg_event_trigger where evtname = 'ensure_rls') as trigger_enabled,
  has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') as anon_can_execute;
