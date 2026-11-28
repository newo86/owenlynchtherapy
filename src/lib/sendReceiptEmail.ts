import { supabaseAdmin, dbError } from '@/lib/supabase';
import { formatClientTime } from '@/lib/dateUtils';
import { getResend } from '@/lib/resend';
import { buildReceiptHtml, inPersonAddressFor, EMAIL_FROM } from '@/lib/emailTemplates';
import { PRACTICE } from '@/practice.config';

interface ReceiptSession {
  id: string;
  fee: number;
  session_date: string;
  session_format: string;
}

export type ReceiptResult = 'sent' | 'already_sent' | 'failed';

/**
 * Email the receipt for a session and stamp receipt_sent_at. Shared by the
 * explicit send-receipt route and the "session done" flow so the email and
 * bookkeeping can never drift apart. Callers check "is it paid?"; this
 * function owns "only once".
 *
 * Unless `force` (an explicit, confirmed resend), it claims the receipt
 * ATOMICALLY first: only the request that moves receipt_sent_at from null
 * sends. A read-then-send check let a double-click email the client twice,
 * the same race the Stripe webhook already guards against
 * (docs/SECURITY.md #11). A failed send releases the claim.
 */
export async function sendReceiptEmail(
  session: ReceiptSession,
  client: { full_name: string; email: string },
  opts: { force?: boolean } = {},
): Promise<ReceiptResult> {
  // Kill switch: the disabled-send stub returns no error, which would look like
  // a successful send and stamp receipt_sent_at for a receipt never sent.
  if (process.env.EMAILS_ENABLED !== 'true') {
    console.warn('[send-receipt-email] Emails disabled — receipt not sent');
    return 'failed';
  }

  if (!opts.force) {
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('sessions')
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq('id', session.id)
      .is('receipt_sent_at', null)
      .select('id');
    if (claimErr) {
      console.error('[send-receipt-email] claim failed:', dbError(claimErr));
      return 'failed';
    }
    if (!claimed || claimed.length === 0) return 'already_sent';
  }

  const firstName = client.full_name.split(' ')[0];
  const feeEuros = Math.round(session.fee / 100);
  const sessionDate = new Date(session.session_date);
  const formattedDate = sessionDate.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
  const formattedTime = formatClientTime(sessionDate);

  let emailResult;
  try {
    emailResult = await getResend().emails.send({
      from: EMAIL_FROM,
      to: client.email,
      subject: `Receipt — Psychotherapy Session with ${PRACTICE.practitionerName}`,
      html: buildReceiptHtml({
        firstName,
        fullName: client.full_name,
        date: formattedDate,
        time: formattedTime,
        feeEuros,
        sessionFormat: session.session_format,
        inPersonAddress: inPersonAddressFor(session.session_date),
      }),
    });
  } catch (err) {
    emailResult = { error: { message: err instanceof Error ? err.message : String(err) } };
  }

  if (emailResult.error) {
    console.error('[send-receipt-email] Resend error:', JSON.stringify(emailResult.error, null, 2));
    if (!opts.force) {
      // Release the claim so the receipt can be sent again.
      await supabaseAdmin.from('sessions').update({ receipt_sent_at: null }).eq('id', session.id);
    }
    return 'failed';
  }

  await supabaseAdmin
    .from('sessions')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('id', session.id);

  console.log('[send-receipt-email] sent for session', session.id);
  return 'sent';
}
