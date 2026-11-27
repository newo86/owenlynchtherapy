import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { closeOutSession } from '@/lib/closeOutSession';
import {
  sessionsNeedingPrompt, promptLabel, nextMorning, isPromptChoice, PROMPT_WINDOW_DAYS,
  type PromptSession, type PromptRow,
} from '@/lib/paymentPrompts';

// "Did they pay?" for the dashboard card.
//   GET  - the open prompts (ignoring quiet hours; snoozed ones included and
//          flagged). Names and emails go only to the logged-in practitioner.
//   POST - the practitioner's answer. Nothing reaches a client unless they
//          chose "Paid - email receipt" and confirmed it in the dashboard.

export const dynamic = 'force-dynamic';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

type SessionRowDb = PromptSession & {
  client_id: string;
  receipt_sent_at: string | null;
  clients: { full_name: string; email: string | null } | null;
};

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const now = new Date();
  const since = new Date(now.getTime() - PROMPT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, session_date, status, payment_status, fee, client_id, receipt_sent_at, clients(full_name, email)')
    .in('status', ['scheduled', 'attended'])
    .eq('payment_status', 'unpaid')
    .gte('session_date', since)
    .lte('session_date', now.toISOString())
    .order('session_date', { ascending: true });
  if (error) {
    console.error('[payment-prompts] sessions query failed:', dbError(error));
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  // A missing table (migration not run yet) just means no prompts yet.
  const { data: prompts, error: promptErr } = await supabaseAdmin
    .from('payment_prompts')
    .select('session_id, prompt_count, last_prompted_at, snoozed_until, resolved_at');
  if (promptErr) console.warn('[payment-prompts] prompt table unavailable (run payment_prompts.sql):', promptErr.message);
  const rows = (promptErr ? [] : prompts ?? []) as PromptRow[];
  const snoozeOf = new Map(rows.map(p => [p.session_id, p.snoozed_until]));

  const due = sessionsNeedingPrompt((sessions ?? []) as unknown as SessionRowDb[], rows, now, { forDashboard: true });
  const out = due.map(s => {
    const until = snoozeOf.get(s.id);
    return {
      session_id: s.id,
      session_date: s.session_date,
      fee: s.fee ?? 0,
      label: promptLabel({ full_name: s.clients?.full_name ?? '' }),
      client_name: s.clients?.full_name ?? '',
      client_email: s.clients?.email ?? null,
      receipt_sent_at: s.receipt_sent_at ?? null,
      snoozed: Boolean(until && new Date(until).getTime() > now.getTime()),
    };
  });

  return NextResponse.json({ prompts: out }, { headers: noCache });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { session_id?: unknown; choice?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
  if (!sessionId) return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  if (!isPromptChoice(body.choice)) {
    return NextResponse.json({ error: 'choice must be paid_receipt, paid_no_receipt or remind_tomorrow' }, { status: 400 });
  }
  const choice = body.choice;

  // Re-read the session: never act on what the dashboard last showed.
  const { data: session, error: fetchErr } = await supabaseAdmin
    .from('sessions')
    .select('id, status, payment_status')
    .eq('id', sessionId)
    .single();
  if (fetchErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const resolve = async (resolution: 'paid_receipt' | 'paid_no_receipt' | 'already_paid') => {
    const { error } = await supabaseAdmin.from('payment_prompts').upsert(
      { session_id: sessionId, resolved_at: nowIso, resolution, snoozed_until: null },
      { onConflict: 'session_id' },
    );
    if (error) console.warn('[payment-prompts] could not record resolution:', error.message);
  };

  // Already paid (e.g. Stripe or another tap got there first): nothing to do.
  if (session.payment_status === 'paid') {
    await resolve('already_paid');
    return NextResponse.json({ ok: true, alreadyPaid: true, outcome: 'already_paid' }, { headers: noCache });
  }
  if (session.payment_status !== 'unpaid' || (session.status !== 'scheduled' && session.status !== 'attended')) {
    return NextResponse.json(
      { error: `This session is ${session.status === 'scheduled' || session.status === 'attended' ? session.payment_status : session.status}, so there's nothing to record.` },
      { status: 409 },
    );
  }

  if (choice === 'remind_tomorrow') {
    const until = nextMorning(new Date());
    const { error } = await supabaseAdmin.from('payment_prompts').upsert(
      { session_id: sessionId, snoozed_until: until.toISOString() },
      { onConflict: 'session_id' },
    );
    if (error) {
      console.error('[payment-prompts] snooze failed:', dbError(error));
      return NextResponse.json({ error: 'Could not snooze this. Nothing was changed.' }, { status: 500 });
    }
    return NextResponse.json(
      { ok: true, outcome: 'snoozed', snoozed_until: until.toISOString() },
      { headers: noCache },
    );
  }

  // Paid: same close-out as the "Session done" button.
  const result = await closeOutSession(sessionId, {
    record_payment: true,
    send_receipt: choice === 'paid_receipt',
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await resolve(choice);
  return NextResponse.json(
    {
      ok: true,
      outcome: choice,
      paid: result.paid,
      receipt_requested: choice === 'paid_receipt',
      receipt_sent: result.receipt_sent,
    },
    { headers: noCache },
  );
}
