-- Lets a client opt out of automated session-reminder emails (GDPR consent).
-- Only affects reminders — receipts and intake emails are transactional and
-- unaffected. Safe to re-run.

alter table public.clients
  add column if not exists reminders_opted_out boolean not null default false;
