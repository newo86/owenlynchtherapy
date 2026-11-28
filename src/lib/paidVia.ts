// "How did they pay?" (Revolut, cash, card) recorded on the payments ledger.
// Pure helpers plus the one insert both manual-payment paths share
// (/api/admin/mark-paid and closeOutSession), so they cannot drift apart.
//
// The `paid_via` column comes from supabase/migrations/payments_paid_via.sql.
// Until that is applied the column does not exist; the insert then retries
// without it, so marking paid keeps working (the same graceful style as the
// other routes that wait for a migration).
import { supabaseAdmin } from '@/lib/supabase';

export const PAID_VIA = ['revolut', 'cash', 'card', 'stripe', 'other'] as const;
export type PaidVia = (typeof PAID_VIA)[number];
/** What a person can choose by hand. 'stripe' is written only by the webhook (and stays valid in the DB column). */
export const MANUAL_PAID_VIA = ['revolut', 'cash', 'card', 'other'] as const;

export function isPaidVia(v: unknown): v is PaidVia {
  return typeof v === 'string' && (PAID_VIA as readonly string[]).includes(v);
}

/** Validate an optional `paid_via` from a request body. Absent (undefined or
 *  null) is fine and means "default unchanged"; anything else must be one of the manual choices
 *  (revolut, cash, card, other). 'stripe' is refused: a hand-recorded payment can't claim to be Stripe's. */
export function parsePaidVia(v: unknown): { ok: true; value: PaidVia | undefined } | { ok: false } {
  if (v === undefined || v === null) return { ok: true, value: undefined };
  return typeof v === 'string' && (MANUAL_PAID_VIA as readonly string[]).includes(v) ? { ok: true, value: v as PaidVia } : { ok: false };
}

/** True when a database error says the `paid_via` column does not exist yet
 *  (Postgres 42703, or PostgREST's "column not found in the schema cache"). */
export function isMissingPaidViaColumn(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message ?? '').toLowerCase();
  if (!msg.includes('paid_via')) return false;
  return err.code === '42703' || err.code === 'PGRST204' || msg.includes('does not exist') || msg.includes('could not find');
}

export interface LedgerRow {
  session_id: string;
  client_id: string;
  amount_cents: number;
  currency: string;
  session_type: string;
  method: string;
  paid_at: string;
}

/** Insert the ledger row, with `paid_via` when given. If the column is missing,
 *  retry once without it. Returns the final error (null on success). */
export async function insertPaymentRow(
  row: LedgerRow,
  paidVia: PaidVia | undefined,
): Promise<{ message: string } | null> {
  if (!paidVia) {
    const { error } = await supabaseAdmin.from('payments').insert(row);
    return error ?? null;
  }
  const { error } = await supabaseAdmin.from('payments').insert({ ...row, paid_via: paidVia });
  if (!error) return null;
  if (isMissingPaidViaColumn(error)) {
    console.warn('[payments] paid_via column missing (run payments_paid_via.sql); recorded without it');
    const retry = await supabaseAdmin.from('payments').insert(row);
    return retry.error ?? null;
  }
  return error;
}
