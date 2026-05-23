import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  if (session?.payment_status === 'paid') {
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
        html: buildReceiptHtml(firstName, formattedDate, formattedTime, feeEuros),
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

function buildReceiptHtml(firstName: string, date: string, time: string, feeEuros: number): string {
  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
    <p style="color:#C85A1A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;">Owen Lynch</p>
    <p style="color:#FFFFFF;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0;">Psychotherapy</p>
  </div>
  <div style="background-color:#FFFFFF;padding:40px;border-radius:0 0 8px 8px;">
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 28px;">Please find your receipt below for your recent session.</p>
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:24px;background:#FAF7F2;margin:0 0 28px;">
      <p style="font-size:11px;color:#2A4D3C;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Date</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">${date} at ${time}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Service</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">Psychotherapy Session (50 minutes)</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-weight:600;color:#2A4D3C;font-size:15px;">Amount</td>
          <td style="padding:10px 0;text-align:right;font-weight:600;color:#2A4D3C;font-size:15px;">€${feeEuros}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;">Status</td>
          <td style="padding:7px 0;text-align:right;color:#4F8A68;font-weight:500;">Paid</td>
        </tr>
      </table>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Thank you for your payment. If you have any questions, please email
      <a href="mailto:info@owenlynchtherapy.com" style="color:#C85A1A;text-decoration:none;">info@owenlynchtherapy.com</a>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">See you at your next session.</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">Owen</p>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#2A4D3C;font-size:11px;opacity:0.6;letter-spacing:1px;margin:0;">
      owenlynchtherapy.com · IAHIP &amp; ICP Accredited · Dublin &amp; Online
    </p>
  </div>
</div>`;
}
