-- ONGOING CLIENTS: sessions that keep coming.
--
-- A client booked "ongoing" (weekly or every 2 weeks with no end) used to get
-- a fixed batch of session rows, while their Google Calendar event repeated
-- forever. Once the batch ran out, the dashboard flagged every new Google date
-- as "in Google Calendar, not in the app", one per week (Nov 2026).
--
-- A row here says "this client carries on at this rhythm". A daily job
-- (/api/admin/sessions/extend, src/lib/sessionSeries.ts) keeps about 16 weeks
-- of sessions booked ahead on the anchor's weekday and Dublin time, after the
-- client's latest session in the series. It ends when the client is marked
-- Completed (that sets `active` false) or `active` is set false by hand.
--
-- The app stays the source of truth: the job reads only this database and
-- never imports anything from Google.
--
-- Safe to re-run.

create table if not exists public.session_series (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  interval_weeks int  not null check (interval_weeks between 1 and 4),
  -- The repeating Google event the sessions belong to (its base id), if any.
  gcal_event_id  text,
  -- A session on the series' rhythm (weekday + Dublin time); dates step from it.
  anchor_at      timestamptz not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  ended_at       timestamptz
);

create index if not exists session_series_client_idx on public.session_series (client_id);
create unique index if not exists session_series_client_gcal_unique
  on public.session_series (client_id, gcal_event_id)
  where gcal_event_id is not null;

alter table public.session_series enable row level security;
grant all on public.session_series to service_role;
