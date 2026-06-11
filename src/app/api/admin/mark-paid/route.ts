import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sessionKind } from '@/lib/emailTemplates';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// One-click manual payment recording. Marks the session paid and logs it in
// the payments ledger with the correct category — 'cash' for low-cost
// clients, 'manual' otherwise (e.g. a Revolut transfer recorded by hand).
// Stripe payments never come through here; the webhook handles those.
//
// action: 'unmark' reverses a manual mark: sets the session back to unpaid
// and removes its cash/manual ledger rows. Stripe ledger rows are never
// touched — a webhook-confirmed payment can't be undone from here.

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { session_id: string; action?: 'mark' | 'unmark' };
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

  if (body.action === 'unmark') {
    if (session.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'This payment was confirmed by Stripe — it can only be changed via a refund in Stripe' },
        { status: 409 },
      );
    }
    const { error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({ payment_status: 'unpaid', paid_at: null })
      .eq('id', session_id);
    if (updateErr) {
      console.error('[mark-paid] unmark error:', updateErr);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }
    // Remove the manual/cash ledger rows this route created; graceful if the
    // payments table doesn't exist yet.
    const { error: ledgerErr } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('session_id', session_id)
      .in('method', ['cash', 'manual']);
    if (ledgerErr) {
      console.warn('[mark-paid] Could not clean ledger (run the payments migration):', ledgerErr.message);
    }
    console.log(`[mark-paid] Session ${session_id} unmarked (back to unpaid)`);
    return NextResponse.json({ success: true, payment_status: 'unpaid' }, { headers: noCache });
  }

  if (session.payment_status === 'paid') {
    return NextResponse.json({ error: 'Session is already marked paid' }, { status: 409 });
  }

  const client = (session as { clients: { id: string; is_low_cost?: boolean } | null }).clients;
  const isLowCost = Boolean(client?.is_low_cost);
  const kind = sessionKind(session.session_format as string, isLowCost);
  const method = isLowCost ? 'cash' : 'manual';
  const paidAt = new Date().toISOString();

  const { error: updateErr } = await supabaseAdmin
    .from('sessions')
    .update({ payment_status: 'paid', paid_at: paidAt })
    .eq('id', session_id);

  if (updateErr) {
    console.error('[mark-paid] update error:', updateErr);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }

  // Log in the finance ledger. Graceful — if the payments table hasn't been
  // created yet the session is already marked paid; we just skip the log.
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
    console.warn('[mark-paid] Could not log payment (run the payments migration):', ledgerErr.message);
  }

  console.log(`[mark-paid] Session ${session_id} marked paid (${method}, ${kind})`);
  return NextResponse.json({ success: true, method, session_type: kind }, { headers: noCache });
}
