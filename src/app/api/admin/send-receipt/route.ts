import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendReceiptEmail } from '@/lib/sendReceiptEmail';
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

  const sent = await sendReceiptEmail(
    {
      id: session_id,
      fee: session.fee as number,
      session_date: session.session_date as string,
      session_format: session.session_format as string,
    },
    client,
  );

  if (!sent) {
    return NextResponse.json({ error: 'Failed to send receipt email' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
