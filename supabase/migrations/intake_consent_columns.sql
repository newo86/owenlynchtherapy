-- Adds the two new required consent fields on intake submissions:
--   - Therapeutic Agreement
--   - Privacy Policy
-- Existing rows default to false; new submissions can't get past validation
-- without both being true.

alter table public.intake_submissions
  add column if not exists consent_therapeutic_agreement boolean not null default false;

alter table public.intake_submissions
  add column if not exists consent_privacy_policy boolean not null default false;
