import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { updateCalendarEvent } from '@/lib/googleOAuth';
import { localDublinToUtcIso, utcToDublinLocal } from '@/lib/dateUtils';
import { sessionKind, DOXY_URL, INSIGHT_MATTERS_ADDRESS } from '@/lib/emailTemplates';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const VALID_FORMATS = ['in_person', 'online'];
const VALID_PAYMENT = ['paid', 'unpaid', 'refunded'];
const VALID_STATUS = ['scheduled', 'attended', 'cancelled', 'no_show'];

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: {
    session_id: string;
    client_id: string;
    session_date?: string;       // "YYYY-MM-DDTHH:MM" Dublin wall-clock
    fee?: number;                // euros
    session_format?: string;
    payment_status?: string;
    status?: string;
    notes?: string;
    client_name?: string;
    client_email?: string;
    phone?: string;
    apply_format_to_all?: boolean; // propagate format+location change to all client sessions
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id, client_id, apply_format_to_all } = body;
  if (!session_id) return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  if (!client_id)  return NextResponse.json({ error: 'client_id is required' }, { status: 400 });

  // Fetch existing session to get gcal_event_id and current values.
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Build session patch.
  const sessionPatch: Record<string, unknown> = {};
  let newWallClock: string | null = null;

  if (typeof body.session_date === 'string' && body.session_date) {
    newWallClock = body.session_date;
    sessionPatch.session_date = localDublinToUtcIso(body.session_date);
  }
  if (typeof body.fee === 'number' && body.fee > 0) {
    sessionPatch.fee = Math.round(body.fee * 100);
  }
  if (typeof body.session_format === 'string' && VALID_FORMATS.includes(body.session_format)) {
    sessionPatch.session_format = body.session_format;
    sessionPatch.location = body.session_format === 'in_person'
      ? INSIGHT_MATTERS_ADDRESS
      : DOXY_URL;
  }
  // Payment changes go through the same bookkeeping as the mark-paid route —
  // this path used to bypass the payments ledger entirely, so payments
  // recorded via the edit form were invisible to the finance books.
  let paymentTransition: 'to_paid' | 'to_unpaid' | null = null;
  if (typeof body.payment_status === 'string' && VALID_PAYMENT.includes(body.payment_status)
      && body.payment_status !== existing.payment_status) {
    if (existing.payment_status === 'paid' && body.payment_status === 'unpaid') {
      if (existing.stripe_payment_intent_id) {
        return NextResponse.json(
          { error: 'This payment was confirmed by Stripe — it can only be changed via a refund in Stripe' },
          { status: 409 },
        );
      }
      paymentTransition = 'to_unpaid';
      sessionPatch.paid_at = null;
    }
    if (body.payment_status === 'paid') {
      paymentTransition = 'to_paid';
      sessionPatch.paid_at = new Date().toISOString();
    }
    sessionPatch.payment_status = body.payment_status;
  }
  if (typeof body.status === 'string' && VALID_STATUS.includes(body.status)) {
    sessionPatch.status = body.status;
  }
  if (typeof body.notes === 'string') {
    sessionPatch.notes = body.notes.trim() || null;
  }

  if (Object.keys(sessionPatch).length > 0) {
    const { error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .update(sessionPatch)
      .eq('id', session_id);
    if (sessionErr) {
      console.error('[sessions/update] session update error:', sessionErr);
      return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    }
  }

  // Mirror mark-paid's ledger bookkeeping for payment transitions (best-effort,
  // like mark-paid: a missing payments table never fails the request).
  if (paymentTransition === 'to_paid') {
    const { data: clientRow } = await supabaseAdmin
      .from('clients').select('is_low_cost').eq('id', client_id).single();
    const isLowCost = Boolean(clientRow?.is_low_cost);
    const { error: ledgerErr } = await supabaseAdmin.from('payments').insert({
      session_id,
      client_id,
      amount_cents: (sessionPatch.fee as number | undefined) ?? existing.fee ?? 0,
      currency: 'eur',
      session_type: sessionKind(
        (sessionPatch.session_format ?? existing.session_format) as string,
        isLowCost,
      ),
      method: isLowCost ? 'cash' : 'manual',
      paid_at: sessionPatch.paid_at,
    });
    if (ledgerErr) {
      console.warn('[sessions/update] Could not log payment (run the payments migration):', ledgerErr.message);
    }
  } else if (paymentTransition === 'to_unpaid') {
    const { error: ledgerErr } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('session_id', session_id)
      .in('method', ['cash', 'manual']);
    if (ledgerErr) {
      console.warn('[sessions/update] Could not clean ledger:', ledgerErr.message);
    }
  }

  // Build client patch.
  const clientPatch: Record<string, unknown> = {};
  if (typeof body.client_name === 'string' && body.client_name.trim()) {
    clientPatch.full_name = body.client_name.trim();
  }
  if (typeof body.client_email === 'string') {
    clientPatch.email = body.client_email.trim();
  }
  if (typeof body.phone === 'string') {
    clientPatch.phone = body.phone.trim() || null;
  }
  if (Object.keys(clientPatch).length > 0) {
    const { error: clientErr } = await supabaseAdmin
      .from('clients')
      .update(clientPatch)
      .eq('id', client_id);
    if (clientErr) {
      console.error('[sessions/update] client update error:', clientErr);
      return NextResponse.json({ error: clientErr.message }, { status: 500 });
    }
  }

  // Propagate format change to all other sessions for this client.
  if (apply_format_to_all && sessionPatch.session_format) {
    const bulkPatch = {
      session_format: sessionPatch.session_format,
      location: sessionPatch.location,
    };
    const { error: bulkErr } = await supabaseAdmin
      .from('sessions')
      .update(bulkPatch)
      .eq('client_id', client_id)
      .neq('id', session_id);
    if (bulkErr) {
      console.error('[sessions/update] bulk format update error:', bulkErr);
      // Non-fatal — current session was already updated.
    }
  }

  // Sync to Google Calendar if the event is linked and any GCal-relevant field changed.
  const gcalNeedsUpdate = !!(existing.gcal_event_id && (newWallClock || sessionPatch.session_format || clientPatch.full_name));
  if (gcalNeedsUpdate) {
    const format = (sessionPatch.session_format ?? existing.session_format) as string;
    const location = format === 'in_person'
      ? INSIGHT_MATTERS_ADDRESS
      : DOXY_URL;
    const clientName = (clientPatch.full_name ?? body.client_name ?? 'Client') as string;
    const startIso = newWallClock ?? utcToDublinLocal(existing.session_date);
    try {
      await updateCalendarEvent(existing.gcal_event_id, {
        summary: `Session — ${clientName}`,
        description: format === 'online' ? `Join: ${DOXY_URL}` : undefined,
        location,
        startIso,
        durationMinutes: 50,
      });
    } catch (calErr) {
      console.error('[sessions/update] gcal update error:', calErr);
    }
  }

  return NextResponse.json({ ok: true }, { headers: noCache });
}
