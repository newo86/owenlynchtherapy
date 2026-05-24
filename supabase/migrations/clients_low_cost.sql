-- Mark a client as "low-cost" so the Revenue analytics splits them out
-- from full-paying clients. Defaults to false on every existing row.
--
-- Safe to re-run.

alter table public.clients
  add column if not exists is_low_cost boolean not null default false;
