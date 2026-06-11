import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { buildReceiptHtml } from '@/lib/emailTemplates';
const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { session_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  // Mark attended
  const { error: updateErr } = await supabaseAdmin
    .from('sessions')
    .update({ status: 'attended' })
    .eq('id', session_id);

  if (updateErr) {
    console.error('[mark-attended] update error:', JSON.stringify(updateErr, null, 2));
    return NextResponse.json({ error: 'Failed to update session status' }, { status: 500 });
  }

  // Fetch session + client to check payment and possibly send receipt
  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('id', session_id)
    .single();

  let receipt_sent = false;

  // Only send if paid and no receipt sent yet (webhook sends one immediately on payment)
  if (session?.payment_status === 'paid' && !session?.receipt_sent_at) {
    const client = (session as { clients: { full_name: string; email: string } }).clients;
    if (client?.email) {
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

      if (!emailResult.error) {
        await supabaseAdmin
          .from('sessions')
          .update({ receipt_sent_at: new Date().toISOString() })
          .eq('id', session_id);
        receipt_sent = true;
      } else {
        console.error('[mark-attended] receipt email error:', JSON.stringify(emailResult.error, null, 2));
      }
    }
  }

  return NextResponse.json(
    { success: true, receipt_sent, payment_status: session?.payment_status ?? 'unknown' },
    { headers: noCache }
  );
}
