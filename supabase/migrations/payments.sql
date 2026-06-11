-- Finance ledger: one row per confirmed payment. Stripe payments are written
-- by the webhook (/api/webhooks/stripe); cash payments for low-cost sessions
-- are written when the practitioner marks a session paid in the dashboard.
--
-- session_type is always one of the three billing categories and is never
-- merged: 'online' | 'in_person' | 'low_cost'.
--
-- Safe to re-run.

create table if not exists public.payments (
  id                         uuid primary key default gen_random_uuid(),
  session_id                 uuid references public.sessions (id) on delete set null,
  client_id                  uuid references public.clients (id) on delete set null,
  amount_cents               integer not null,
  currency                   text not null default 'eur',
  session_type               text not null check (session_type in ('online', 'in_person', 'low_cost')),
  method                     text not null check (method in ('stripe', 'cash', 'manual')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text,
  paid_at                    timestamptz not null default now(),
  created_at                 timestamptz not null default now()
);

create index if not exists payments_session_id_idx on public.payments (session_id);
create index if not exists payments_client_id_idx  on public.payments (client_id);
create index if not exists payments_paid_at_idx    on public.payments (paid_at);

-- Deny anon/authenticated access — only the service-role key (API routes)
-- touches this table, matching the rest of the schema.
alter table public.payments enable row level security;
