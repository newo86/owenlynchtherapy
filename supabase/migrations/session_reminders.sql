-- Log of reminder emails sent per session. The reminder cron checks this
-- table so a session never gets two automated reminders; manual sends from
-- the dashboard are logged here too.
--
-- Safe to re-run.

create table if not exists public.session_reminders (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  reminder_type text not null default 'email',
  sent_at       timestamptz not null default now()
);

create index if not exists session_reminders_session_id_idx
  on public.session_reminders (session_id);

-- Deny anon/authenticated access — only the service-role key (API routes)
-- touches this table, matching the rest of the schema.
alter table public.session_reminders enable row level security;
