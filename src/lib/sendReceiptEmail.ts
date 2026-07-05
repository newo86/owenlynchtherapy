import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { buildReceiptHtml, EMAIL_FROM } from '@/lib/emailTemplates';
import { PRACTICE } from '@/practice.config';

interface ReceiptSession {
  id: string;
  fee: number;
  session_date: string;
  session_format: string;
}

/**
 * Email the receipt for a session and stamp receipt_sent_at. Shared by the
 * explicit send-receipt route and the "session done" flow so the email and
 * bookkeeping can never drift apart. Callers are responsible for the guards
 * (paid? already sent?) — this just sends and records.
 *
 * Returns true when the email went out and the timestamp was recorded.
 */
export async function sendReceiptEmail(
  session: ReceiptSession,
  client: { full_name: string; email: string },
): Promise<boolean> {
  const firstName = client.full_name.split(' ')[0];
  const feeEuros = Math.round(session.fee / 100);
  const sessionDate = new Date(session.session_date);
  const formattedDate = sessionDate.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });

  let emailResult;
  try {
    emailResult = await getResend().emails.send({
      from: EMAIL_FROM,
      to: client.email,
      subject: `Receipt — Psychotherapy Session with ${PRACTICE.practitionerName}`,
      html: buildReceiptHtml({
        firstName,
        date: formattedDate,
        time: formattedTime,
        feeEuros,
        sessionFormat: session.session_format,
      }),
    });
  } catch (err) {
    emailResult = { error: { message: err instanceof Error ? err.message : String(err) } };
  }

  if (emailResult.error) {
    console.error('[send-receipt-email] Resend error:', JSON.stringify(emailResult.error, null, 2));
    return false;
  }

  await supabaseAdmin
    .from('sessions')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('id', session.id);

  console.log('[send-receipt-email] sent for session', session.id);
  return true;
}
