-- How a client actually paid, recorded when Owen marks a session paid:
-- Revolut, cash or card. Stripe payments stay automatic ('stripe').
--
-- The existing `method` column ('stripe' | 'cash' | 'manual') and its meaning
-- are untouched: it is still the ledger category the app has always written.
-- `paid_via` is the finer, human answer ("Revolut" vs "bank transfer" were both
-- 'manual' before). Nullable: older rows have none, and the dashboard falls
-- back to its old derivation for them.
--
-- The app works without this column (it retries without it), so it can ship
-- before this is applied. Safe to re-run.

alter table public.payments
  add column if not exists paid_via text
  check (paid_via in ('revolut', 'cash', 'card', 'stripe', 'other'));

-- Backfill what is certain from the existing method.
update public.payments set paid_via = 'stripe' where paid_via is null and method = 'stripe';
update public.payments set paid_via = 'cash'   where paid_via is null and method = 'cash';
