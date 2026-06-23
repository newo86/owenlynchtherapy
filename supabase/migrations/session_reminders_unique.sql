-- Hardening for the reminder system (added after a fail-open dedup bug caused
-- duplicate reminder emails). Adds a UNIQUE constraint so a session can have at
-- most ONE reminder of each type logged — the database itself now guarantees a
-- session can never be emailed twice, regardless of any application bug.
--
-- The reminder cron "claims" a row here BEFORE sending; the unique constraint
-- makes a second claim fail, so a duplicate email is impossible.
--
-- Safe to re-run.

-- De-duplicate any existing rows first so the constraint can be added cleanly.
delete from public.session_reminders a
using public.session_reminders b
where a.ctid < b.ctid
  and a.session_id = b.session_id
  and a.reminder_type = b.reminder_type;

alter table public.session_reminders
  drop constraint if exists session_reminders_session_type_unique;

alter table public.session_reminders
  add constraint session_reminders_session_type_unique
  unique (session_id, reminder_type);
