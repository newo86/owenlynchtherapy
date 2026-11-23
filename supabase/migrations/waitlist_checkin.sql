-- Waiting list: emailing the list from the dashboard and recording replies.
--
--   last_emailed_at  when this person was last sent a message from the
--                    dashboard ("Email the waiting list"). Also guards against
--                    emailing someone twice by accident within 12 hours.
--   response         their answer from the email's buttons: 'yes' (still
--                    interested) or 'no' (no longer looking). Cleared when a
--                    new message is sent, so it always reflects the latest one.
--   responded_at     when they answered.
--
-- A 'no' also sets status = 'declined' (hidden from the waiting count and
-- from future sends; the practitioner removes their details with Remove).
-- Additive and safe to re-run.

do $$
begin
  if to_regclass('public.waitlist') is not null then
    alter table public.waitlist add column if not exists last_emailed_at timestamptz;
    alter table public.waitlist add column if not exists response text;
    alter table public.waitlist add column if not exists responded_at timestamptz;
    if not exists (
      select 1 from pg_constraint where conname = 'waitlist_response_check'
    ) then
      alter table public.waitlist
        add constraint waitlist_response_check check (response is null or response in ('yes', 'no'));
    end if;
    raise notice 'waitlist: check-in columns present';
  else
    raise notice 'SKIPPED: public.waitlist does not exist';
  end if;
end $$;

-- Verify: expect three rows.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'waitlist'
  and column_name in ('last_emailed_at', 'response', 'responded_at')
order by column_name;
