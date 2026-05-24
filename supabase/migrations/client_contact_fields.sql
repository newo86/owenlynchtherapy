-- New personal / contact detail columns on the clients table.
-- All nullable — none are required at intake.

alter table public.clients
  add column if not exists date_of_birth text;

alter table public.clients
  add column if not exists emergency_contact_name text;

alter table public.clients
  add column if not exists emergency_contact_phone text;

alter table public.clients
  add column if not exists gp_name text;

alter table public.clients
  add column if not exists gp_phone text;
