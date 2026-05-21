-- Adds a free-text notes column on clients for the admin client-detail panel.
-- Safe to run multiple times.

alter table public.clients
  add column if not exists notes text;
