-- Add an optional "what brings you to therapy" note to the waiting list.
--
-- GDPR notes (see docs/DATA-RETENTION.md):
--  - This field is OPTIONAL and free text. A person may choose to share a brief
--    note about what they're looking for, which can include health-related /
--    special-category information. The waiting-list consent wording covers it
--    ("anything I choose to share about what brings me to therapy"), so consent
--    is the lawful basis; entries remain erasable from the dashboard.
--  - Nothing is required — leaving it blank stores NULL.
--
-- Safe to re-run.

alter table public.waitlist add column if not exists reason text;
