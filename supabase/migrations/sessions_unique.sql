-- KILL DUPLICATE SESSIONS AT THE ROOT.
--
-- The calendar auto-import is check-then-insert with three overlapping
-- triggers (5-min cron, dashboard polls, reminders cron), which creates
-- twin rows for the same slot. Twins show up in the client record, inflate
-- statements/reports, and can shadow a paid row with an unpaid duplicate.
--
-- This script (1) merges existing twins — keeping the best row (paid >
-- attended > receipted > calendar-linked) and re-pointing ledger rows at
-- the keeper — then (2) adds a partial UNIQUE index so the database itself
-- refuses a second live row for the same client + timeslot forever.
--
-- Safe to re-run.

-- 1. Map each duplicate to its keeper.
create temp table if not exists dup_sessions as
select id, keeper_id from (
  select id,
         row_number() over w as rn,
         first_value(id) over w as keeper_id
  from public.sessions
  where status <> 'cancelled'
  window w as (
    partition by client_id, session_date
    order by (payment_status = 'paid') desc,
             (status = 'attended') desc,
             (receipt_sent_at is not null) desc,
             (gcal_event_id is not null) desc,
             id
  )
) ranked
where rn > 1;

-- 2. Re-point finance ledger rows at the keeper (money records survive).
update public.payments p
set session_id = d.keeper_id
from dup_sessions d
where p.session_id = d.id;

-- 3. Delete the duplicate rows. session_reminders rows cascade away with
--    them (FK is ON DELETE CASCADE); past sessions are never reminder
--    candidates again, so no re-send risk.
delete from public.sessions s
using dup_sessions d
where s.id = d.id;

drop table dup_sessions;

-- 4. The backstop: one live session per client per timeslot, enforced by
--    the database. The auto-import's insert of a twin now simply fails.
create unique index if not exists sessions_client_slot_unique
  on public.sessions (client_id, session_date)
  where status <> 'cancelled';
