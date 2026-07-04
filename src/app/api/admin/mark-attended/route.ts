import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sessionKind } from '@/lib/emailTemplates';
import { sendReceiptEmail } from '@/lib/sendReceiptEmail';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// "Session done" — closes out a session in one explicit call:
//   - always: status → attended
//   - record_payment: also mark paid + log to the payments ledger
//     ('cash' for low-cost clients, 'manual' otherwise), exactly like the
//     mark-paid route
//   - send_receipt: also email the receipt (only if the session ends up paid
//     and none was sent before)
//
// Everything is opt-in and the response states exactly what happened. The
// old behaviour — silently auto-emailing a receipt whenever a paid session
// was marked attended — is gone: receipts now only go out when the UI asked
// for them, which the button labels state up front (docs/OPERATIONS.md).

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { session_id: string; record_payment?: boolean; send_receipt?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const { data: session, error: fetchErr } = await supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('id', session_id)
    .single();

  if (fetchErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const client = (session as {
    clients: { id: string; full_name: string; email: string; is_low_cost?: boolean } | null;
  }).clients;

  // 1. Mark attended.
  const { error: updateErr } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'attended' })
    .eq('id', session_id);

  if (updateErr) {
    console.error('[mark-attended] update error:', JSON.stringify(updateErr, null, 2));
    return NextResponse.json({ error: 'Failed to update session status' }, { status: 500 });
  }

  // 2. Record the payment, if asked and not already paid.
  let paid = session.payment_status === 'paid';
  if (body.record_payment && !paid) {
    const isLowCost = Boolean(client?.is_low_cost);
    const kind = sessionKind(session.session_format as string, isLowCost);
    const method = isLowCost ? 'cash' : 'manual';
    const paidAt = new Date().toISOString();

    const { error: payErr } = await supabaseAdmin
      .from('sessions')
      .update({ payment_status: 'paid', paid_at: paidAt })
      .eq('id', session_id);

    if (payErr) {
      console.error('[mark-attended] payment update error:', payErr);
      return NextResponse.json(
        { error: 'Marked attended, but recording the payment failed — mark it paid separately.' },
        { status: 500 },
      );
    }
    paid = true;

    const { error: ledgerErr } = await supabaseAdmin.from('payments').insert({
      session_id,
      client_id: session.client_id,
      amount_cents: session.fee ?? 0,
      currency: 'eur',
      session_type: kind,
      method,
      paid_at: paidAt,
    });
    if (ledgerErr) {
      console.warn('[mark-attended] Could not log payment (run the payments migration):', ledgerErr.message);
    }
  }

  // 3. Email the receipt, if asked — guarded exactly like send-receipt.
  let receipt_sent = false;
  if (body.send_receipt && paid && !session.receipt_sent_at && client?.email) {
    receipt_sent = await sendReceiptEmail(
      {
        id: session_id,
        fee: session.fee as number,
        session_date: session.session_date as string,
        session_format: session.session_format as string,
      },
      client,
    );
  }

  return NextResponse.json(
    {
      success: true,
      paid,
      receipt_sent,
      payment_status: paid ? 'paid' : (session.payment_status ?? 'unknown'),
    },
    { headers: noCache },
  );
}
