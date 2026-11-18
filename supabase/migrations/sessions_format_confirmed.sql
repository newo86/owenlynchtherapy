-- Sessions: record whether the session's format (online / in person) is
-- known, or was only guessed.
--
-- Why (18 Nov 2026): a calendar event with no Meet link and no location was
-- imported as "online" because the client's previous session was online.
-- It was actually in person, so the client's reminder said online and the
-- session was lost. Calendar imports that can't tell the format now set
-- format_confirmed = false, and no reminder is sent for such a session until
-- the practitioner sets the format in the dashboard.
--
-- Existing rows default to true (confirmed): they have been in use and
-- checked by hand. Additive and safe to re-run.

do $$
begin
  if to_regclass('public.sessions') is not null then
    alter table public.sessions
      add column if not exists format_confirmed boolean not null default true;
    raise notice 'sessions.format_confirmed: present';
  else
    raise notice 'SKIPPED: public.sessions does not exist';
  end if;
end $$;

-- Verify: expect one row, data_type boolean, column_default true.
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sessions' and column_name = 'format_confirmed';
