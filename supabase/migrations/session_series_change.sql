-- CHANGING HOW OFTEN, SAFELY (28 Nov 2026).
--
-- The client record's "How often" (POST /api/admin/sessions/series/interval)
-- changes a series in Google AND in the app. Two things make that safe:
--
-- 1. A short lock on the series row (change_lock_until + change_lock_token).
--    The request claims the row first, with a conditional update that only
--    succeeds if the series still has the rhythm and Google id the page
--    showed and nobody else holds the lock, and stores a random token. Only
--    the holder of that token can run the change or release the lock. A
--    double tap, a second tab, or the 5-minute calendar job (which leaves a
--    locked series alone) can't act on it at the same time. The lock expires
--    by itself after a few minutes, so a crashed request can't leave it stuck.
--
-- 2. apply_series_interval_change(): every database step of the change
--    (cancel the sessions that no longer fit, tie the kept ones to the new
--    Google repeat, add the new in-between weeks, update the series, release
--    the lock) in ONE transaction. Either all of it happens or none of it, so
--    Google's old repeat is only ended once the app has fully changed.
--
-- Until this is applied, "How often" refuses with "needs a database update"
-- and changes nothing. Needs session_series.sql and
-- sessions_format_confirmed.sql first. Safe to re-run.

alter table public.session_series add column if not exists change_lock_until timestamptz;
alter table public.session_series add column if not exists change_lock_token uuid;

-- An earlier draft of this function had fewer arguments: drop it if present.
drop function if exists public.apply_series_interval_change(uuid, int, timestamptz, text, uuid[], uuid[], jsonb);

create or replace function public.apply_series_interval_change(
  p_series_id       uuid,
  p_lock_token      uuid,
  p_expect_interval int,
  p_expect_gcal     text,
  p_interval  int,
  p_anchor    timestamptz,
  p_new_gcal  text,
  p_cancel    uuid[],
  p_relink    uuid[],
  p_adds      jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_series public.session_series%rowtype;
  v_row    jsonb;
  v_added  int := 0;
begin
  if p_interval < 1 or p_interval > 4 then
    raise exception 'interval out of range';
  end if;

  select * into v_series from public.session_series where id = p_series_id for update;
  if not found or not v_series.active
     or v_series.change_lock_until is null or v_series.change_lock_until < now()
     or v_series.change_lock_token is distinct from p_lock_token then
    raise exception 'series is not claimed for this change';
  end if;
  if v_series.interval_weeks is distinct from p_expect_interval
     or v_series.gcal_event_id is distinct from p_expect_gcal then
    raise exception 'series changed since it was claimed';
  end if;

  update public.sessions set status = 'cancelled'
   where id = any(coalesce(p_cancel, '{}')) and client_id = v_series.client_id and status = 'scheduled';

  update public.sessions set gcal_event_id = p_new_gcal
   where id = any(coalesce(p_relink, '{}')) and client_id = v_series.client_id and status = 'scheduled';

  for v_row in select * from jsonb_array_elements(coalesce(p_adds, '[]'::jsonb)) loop
    begin
      insert into public.sessions
        (client_id, session_date, session_format, format_confirmed, location, fee, status, payment_status, gcal_event_id)
      values
        (v_series.client_id,
         (v_row->>'session_date')::timestamptz,
         v_row->>'session_format',
         coalesce((v_row->>'format_confirmed')::boolean, true),
         v_row->>'location',
         (v_row->>'fee')::int,
         'scheduled', 'unpaid', p_new_gcal);
      v_added := v_added + 1;
    exception when unique_violation then
      -- The client already has a live session at that time: keep theirs.
      null;
    end;
  end loop;

  update public.session_series
     set interval_weeks = p_interval, anchor_at = p_anchor, gcal_event_id = p_new_gcal,
         change_lock_until = null, change_lock_token = null
   where id = p_series_id;

  return jsonb_build_object('added', v_added);
end;
$$;

revoke all on function public.apply_series_interval_change(uuid, uuid, int, text, int, timestamptz, text, uuid[], uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.apply_series_interval_change(uuid, uuid, int, text, int, timestamptz, text, uuid[], uuid[], jsonb) to service_role;
