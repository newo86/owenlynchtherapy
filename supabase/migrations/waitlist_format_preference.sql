-- Waiting list: whether the person would like online or in-person sessions,
-- asked on the sign-up form (23 Nov 2026). 'either' = no preference.
-- Older entries stay NULL (not asked). Additive and safe to re-run.

do $$
begin
  if to_regclass('public.waitlist') is not null then
    alter table public.waitlist add column if not exists format_preference text;
    if not exists (select 1 from pg_constraint where conname = 'waitlist_format_preference_check') then
      alter table public.waitlist
        add constraint waitlist_format_preference_check
        check (format_preference is null or format_preference in ('online', 'in_person', 'either'));
    end if;
    raise notice 'waitlist.format_preference present';
  else
    raise notice 'SKIPPED: public.waitlist does not exist';
  end if;
end $$;

-- Verify: expect one row.
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'waitlist' and column_name = 'format_preference';
