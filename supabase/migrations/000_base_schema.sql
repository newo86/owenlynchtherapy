-- BASE SCHEMA — the four original tables (clients, sessions, intake_tokens,
-- intake_submissions) that predate this migrations folder.
--
-- Purpose: let a NEW practice (a clone of this template) build its database
-- entirely from supabase/migrations/. Run this FIRST, then every other file,
-- then service_role_grants.sql + ../supabase-rls-policy.sql.
--
-- Derived from the application code (types + every query), not dumped from
-- production, so on the ORIGINAL practice's database this file is a no-op
-- (IF NOT EXISTS everywhere) — safe, but pointless, to run there.
-- Columns added by later migrations (notes, is_low_cost, client_id links,
-- consent columns, gcal_event_id, …) are NOT here — their own files add them.
--
-- Safe to re-run.

create extension if not exists pgcrypto;

-- ── clients ───────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null default '',
  phone       text,
  session_fee integer not null,            -- cents
  status      text not null default 'active'
              check (status in ('active', 'new', 'completed')),
  created_at  timestamptz not null default now()
);

-- ── sessions ──────────────────────────────────────────────────────────────
create table if not exists public.sessions (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references public.clients(id),
  session_date             timestamptz not null,
  session_format           text not null check (session_format in ('in_person', 'online')),
  location                 text,
  fee                      integer not null,   -- cents
  status                   text not null default 'scheduled'
                           check (status in ('scheduled', 'attended', 'cancelled', 'no_show')),
  payment_status           text not null default 'unpaid'
                           check (payment_status in ('paid', 'unpaid', 'refunded')),
  stripe_payment_link_url  text,
  stripe_payment_link_id   text,
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  receipt_sent_at          timestamptz,
  notes                    text,
  created_at               timestamptz not null default now()
);
create index if not exists sessions_client_id_idx on public.sessions (client_id);
create index if not exists sessions_session_date_idx on public.sessions (session_date);

-- ── intake_tokens ─────────────────────────────────────────────────────────
create table if not exists public.intake_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        text not null unique,
  client_name  text,
  client_email text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  is_used      boolean not null default false
);

-- ── intake_submissions ────────────────────────────────────────────────────
create table if not exists public.intake_submissions (
  id                             uuid primary key default gen_random_uuid(),
  token_id                       uuid not null references public.intake_tokens(id),
  full_name                      text not null,
  preferred_name                 text,
  email                          text not null,
  phone                          text not null,
  date_of_birth                  text not null,
  pronouns                       text,
  session_format                 text not null
                                 check (session_format in ('in_person', 'online', 'no_preference')),
  referral_source                text not null,
  referral_source_other          text,
  reason_for_therapy             text not null,
  diagnosed_conditions           text,
  previous_therapy               boolean,
  previous_therapy_details       text,
  current_medication             text,
  seeing_psychiatrist            boolean,
  psychiatrist_details           text,
  uses_ai_tools                  text check (uses_ai_tools is null or uses_ai_tools in ('yes', 'sometimes', 'no')),
  emergency_contact_name         text not null,
  emergency_contact_phone        text not null,
  emergency_contact_relationship text not null,
  gp_name                        text,
  gp_practice                    text,
  consent_data_storage           boolean,
  consent_age_confirmation       boolean,
  additional_info                text,
  submitted_at                   timestamptz not null default now()
);
create index if not exists intake_submissions_token_id_idx on public.intake_submissions (token_id);

-- Deny-all by default; the app connects with the service role only.
alter table public.clients enable row level security;
alter table public.sessions enable row level security;
alter table public.intake_tokens enable row level security;
alter table public.intake_submissions enable row level security;
