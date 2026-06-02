import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';

const REVOLUT_IN_PERSON = 'https://checkout.revolut.com/pay/ffdf3049-df23-42d6-8e29-27fef9a14e69';
const REVOLUT_ONLINE    = 'https://checkout.revolut.com/pay/f08b12df-f045-4df4-badf-4f01b9d7e0aa';
const DOXY_URL          = 'https://doxy.me/v2/check-in/owenlynchtherapy/';

export interface ReminderResult {
  success: boolean;
  email?: string;
  error?: string;
}

/**
 * Send a session reminder email to the client.
 * Structured as a standalone function so it can be called by both the
 * manual /api/admin/send-reminder route and a future automated cron job.
 */
export async function sendSessionReminder(sessionId: string): Promise<ReminderResult> {
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !session) {
    console.error('[send-reminder] session not found:', sessionErr);
    return { success: false, error: 'Session not found' };
  }

  type ClientShape = { full_name: string; email: string };
  const client = (session as { clients: ClientShape }).clients as ClientShape | null;

  if (!client?.email) {
    return { success: false, error: 'Client email not found' };
  }

  const isOnline  = session.session_format === 'online';
  const firstName = client.full_name.split(' ')[0];
  const sessionDate = new Date(session.session_date as string);
  const formattedTime = sessionDate.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });
  const paymentUrl = isOnline ? REVOLUT_ONLINE : REVOLUT_IN_PERSON;

  const emailResult = await getResend().emails.send({
    from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
    to: client.email,
    subject: 'Reminder — your session today with Owen Lynch',
    html: buildReminderHtml(firstName, formattedTime, isOnline, paymentUrl),
  });

  if (emailResult.error) {
    console.error('[send-reminder] Resend error:', JSON.stringify(emailResult.error, null, 2));
    return { success: false, error: 'Failed to send reminder email' };
  }

  // Log to session_reminders. Graceful — if the table hasn't been created
  // yet the email is already sent; we just skip the log.
  const { error: logErr } = await supabaseAdmin
    .from('session_reminders')
    .insert({ session_id: sessionId, reminder_type: 'email' });

  if (logErr) {
    console.warn('[send-reminder] Could not log reminder (run the migration):', logErr.message);
  }

  console.log(`[send-reminder] Sent to ${client.email} for session ${sessionId}`);
  return { success: true, email: client.email };
}

function buildReminderHtml(
  firstName: string,
  time: string,
  isOnline: boolean,
  paymentUrl: string,
): string {
  const doxyBlock = isOnline ? `
    <div style="background:#EEF6F0;border:1px solid #C3DDD0;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#2A4D3C;letter-spacing:1px;text-transform:uppercase;">Join your online session</p>
      <p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.7;">
        Here is the link to join your online session:
      </p>
      <a href="${DOXY_URL}" style="color:#4F8A68;font-weight:600;font-size:14px;text-decoration:none;">${DOXY_URL}</a>
      <p style="margin:10px 0 0;font-size:13px;color:#777;">Please join a few minutes early so we can start on time.</p>
    </div>` : '';

  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
    <p style="color:#C85A1A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;">Owen Lynch</p>
    <p style="color:#FFFFFF;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0;">Psychotherapy</p>
  </div>
  <div style="background-color:#FFFFFF;padding:40px;border-radius:0 0 8px 8px;">
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
      This is a quick reminder about your session today at ${time}.
    </p>
    ${doxyBlock}
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:20px 24px;background:#FAF7F2;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.7;">
        If you haven&rsquo;t already, you can pay for today&rsquo;s session here:
      </p>
      <a href="${paymentUrl}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">Pay via Revolut</a>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">
      If you have any questions or need to reschedule, please get in touch.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 4px;">See you soon,</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">Owen Lynch<br>
      <span style="font-weight:400;font-size:13px;color:#666;">Owen Lynch Psychotherapy<br>
      owenlynchtherapy.com</span>
    </p>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#2A4D3C;font-size:11px;opacity:0.6;letter-spacing:1px;margin:0;">
      owenlynchtherapy.com &middot; IAHIP &amp; ICP Accredited &middot; Dublin &amp; Online
    </p>
  </div>
</div>`;
}
