import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { buildReceiptHtml } from '@/lib/emailTemplates';
const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { session_id: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  // Fetch session and client together
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('id', session_id)
    .single();

  if (sessionErr || !session) {
    console.error('[send-receipt] session not found:', sessionErr);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const client = (session as { clients: { full_name: string; email: string } }).clients;
  if (!client?.email) {
    return NextResponse.json({ error: 'Client email not found' }, { status: 400 });
  }

  // GUARDS — this used to send unconditionally: a receipt could go out for an
  // unpaid or future session, and every extra click emailed a duplicate.
  if (session.payment_status !== 'paid') {
    return NextResponse.json(
      { error: "This session isn't marked paid — record the payment first, then send the receipt." },
      { status: 400 },
    );
  }
  if (session.receipt_sent_at && !body.force) {
    // 409 tells the UI a receipt already went out; resending requires an
    // explicit force after the practitioner confirms.
    return NextResponse.json(
      { error: 'Receipt already sent', already_sent_at: session.receipt_sent_at },
      { status: 409 },
    );
  }

  const firstName = client.full_name.split(' ')[0];
  const feeEuros = Math.round((session.fee as number) / 100);
  const sessionDate = new Date(session.session_date as string);
  const formattedDate = sessionDate.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });

  const emailResult = await getResend().emails.send({
    from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
    to: client.email,
    subject: 'Receipt — Psychotherapy Session with Owen Lynch',
    html: buildReceiptHtml({ firstName, date: formattedDate, time: formattedTime, feeEuros, sessionFormat: session.session_format as string }),
  });

  if (emailResult.error) {
    console.error('[send-receipt] Resend error:', JSON.stringify(emailResult.error, null, 2));
    return NextResponse.json({ error: 'Failed to send receipt email' }, { status: 500 });
  }

  // Update receipt_sent_at
  await supabaseAdmin
    .from('sessions')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('id', session_id);

  console.log('[send-receipt] sent for session', session_id);
  return NextResponse.json({ success: true }, { headers: noCache });
}
