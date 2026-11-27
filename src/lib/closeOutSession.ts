import { supabaseAdmin, dbError } from '@/lib/supabase';
import { sessionKind } from '@/lib/emailTemplates';
import { sendReceiptEmail } from '@/lib/sendReceiptEmail';

// Shared "Session done" close-out, used by /api/admin/mark-attended and the
// "Did they pay?" prompt (/api/admin/payment-prompts). One implementation so
// the two can never drift apart:
//   - always: status -> attended
//   - record_payment: also mark paid + log to the payments ledger
//     ('cash' for low-cost clients, 'manual' otherwise), like mark-paid
//   - send_receipt: also email the receipt (only if the session ends up paid
//     and none was sent before)
// Everything is opt-in; the result states exactly what happened.

export interface CloseOutOptions {
  record_payment?: boolean;
  send_receipt?: boolean;
}

export type CloseOutResult =
  | { ok: true; paid: boolean; receipt_sent: boolean; payment_status: string }
  | { ok: false; status: number; error: string };

export async function closeOutSession(sessionId: string, opts: CloseOutOptions): Promise<CloseOutResult> {
  const { data: session, error: fetchErr } = await supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('id', sessionId)
    .single();

  if (fetchErr || !session) {
    return { ok: false, status: 404, error: 'Session not found' };
  }

  const client = (session as {
    clients: { id: string; full_name: string; email: string; is_low_cost?: boolean } | null;
  }).clients;

  // 1. Mark attended.
  const { error: updateErr } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'attended' })
    .eq('id', sessionId);

  if (updateErr) {
    console.error('[close-out] update error:', dbError(updateErr));
    return { ok: false, status: 500, error: 'Failed to update session status' };
  }

  // 2. Record the payment, if asked and not already paid.
  let paid = session.payment_status === 'paid';
  if (opts.record_payment && !paid) {
    const isLowCost = Boolean(client?.is_low_cost);
    const kind = sessionKind(session.session_format as string, isLowCost);
    const method = isLowCost ? 'cash' : 'manual';
    const paidAt = new Date().toISOString();

    const { error: payErr } = await supabaseAdmin
      .from('sessions')
      .update({ payment_status: 'paid', paid_at: paidAt })
      .eq('id', sessionId);

    if (payErr) {
      console.error('[close-out] payment update error:', dbError(payErr));
      return {
        ok: false,
        status: 500,
        error: 'Marked attended, but recording the payment failed — mark it paid separately.',
      };
    }
    paid = true;

    const { error: ledgerErr } = await supabaseAdmin.from('payments').insert({
      session_id: sessionId,
      client_id: session.client_id,
      amount_cents: session.fee ?? 0,
      currency: 'eur',
      session_type: kind,
      method,
      paid_at: paidAt,
    });
    if (ledgerErr) {
      console.warn('[close-out] Could not log payment (run the payments migration):', ledgerErr.message);
    }
  }

  // 3. Email the receipt, if asked — guarded exactly like send-receipt.
  let receipt_sent = false;
  if (opts.send_receipt && paid && !session.receipt_sent_at && client?.email) {
    receipt_sent = 'sent' === await sendReceiptEmail(
      {
        id: sessionId,
        fee: session.fee as number,
        session_date: session.session_date as string,
        session_format: session.session_format as string,
      },
      client,
    );
  }

  return {
    ok: true,
    paid,
    receipt_sent,
    payment_status: paid ? 'paid' : (session.payment_status ?? 'unknown'),
  };
}
