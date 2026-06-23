import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { buildReminderHtml, paymentLinkFor, sessionKind } from '@/lib/emailTemplates';

export interface ReminderResult {
  success: boolean;
  email?: string;
  error?: string;
  /** True when the reminder was deliberately not sent (already reminded /
   *  not a scheduled session) rather than failing. */
  skipped?: boolean;
}

export interface ReminderOptions {
  /** When true (the cron path), silently skip sessions that already have a
   *  reminder logged in session_reminders instead of sending a duplicate. */
  skipIfAlreadySent?: boolean;
}

/**
 * Send a session reminder email to the client. The content adapts to the
 * session's billing category:
 *  - online     → doxy.me join link + Stripe payment link
 *  - in person  → Insight Matters address + Stripe payment link
 *  - low cost   → Insight Matters address only, payment is cash on the day
 *
 * Reminders only go out for scheduled (confirmed) sessions — never for
 * cancelled, attended or no-show ones. Called by the manual
 * /api/admin/send-reminder route and the daily reminders cron.
 */
export async function sendSessionReminder(
  sessionId: string,
  options: ReminderOptions = {},
): Promise<ReminderResult> {
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !session) {
    console.error('[send-reminder] session not found:', sessionErr);
    return { success: false, error: 'Session not found' };
  }

  if (session.status !== 'scheduled') {
    return {
      success: false,
      skipped: true,
      error: `Session is ${session.status} — reminders only go to scheduled sessions`,
    };
  }

  type ClientShape = { full_name: string; email: string; is_low_cost?: boolean };
  const client = (session as { clients: ClientShape | null }).clients;

  if (!client?.email) {
    return { success: false, error: 'Client email not found' };
  }

  // The cron path claims a reminder row BEFORE sending (see below); manual
  // sends just log afterwards. `auto` distinguishes the two.
  const auto = options.skipIfAlreadySent === true;

  const kind = sessionKind(session.session_format as string, Boolean(client.is_low_cost));
  const firstName = client.full_name.split(' ')[0];
  const sessionDate = new Date(session.session_date as string);

  const formattedTime = sessionDate.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });
  const isToday = sessionDate.toLocaleDateString('en-IE', { timeZone: 'Europe/Dublin' })
    === new Date().toLocaleDateString('en-IE', { timeZone: 'Europe/Dublin' });
  const dayPhrase = isToday
    ? 'today'
    : 'on ' + sessionDate.toLocaleDateString('en-IE', {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Dublin',
      });

  // Cron path: CLAIM the reminder before sending. The UNIQUE(session_id,
  // reminder_type) constraint makes a duplicate claim fail, so a session can
  // never be emailed twice — even if this runs twice. Fail-closed: if we
  // cannot record the claim (e.g. the table/constraint is missing), we do
  // NOT send. This is the opposite of the old behaviour that caused the flood.
  if (auto) {
    const { error: claimErr } = await supabaseAdmin
      .from('session_reminders')
      .insert({ session_id: sessionId, reminder_type: 'email' });
    if (claimErr) {
      if (claimErr.code === '23505') {
        return { success: false, skipped: true, error: 'Reminder already sent' };
      }
      console.error('[send-reminder] claim failed — NOT sending:', claimErr.message);
      return { success: false, error: 'Reminder ledger unavailable — not sending' };
    }
  }

  const emailResult = await getResend().emails.send({
    from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
    to: client.email,
    subject: isToday
      ? 'Reminder — your session today with Owen Lynch'
      : 'Reminder — your upcoming session with Owen Lynch',
    html: buildReminderHtml({
      firstName,
      time: formattedTime,
      dayPhrase,
      kind,
      sessionFormat: session.session_format as string,
      paymentUrl: paymentLinkFor(kind, sessionId, client.email),
      alreadyPaid: session.payment_status === 'paid',
    }),
  });

  if (emailResult.error) {
    console.error('[send-reminder] Resend error:', JSON.stringify(emailResult.error, null, 2));
    // Release the claim so a later run can retry this session.
    if (auto) {
      await supabaseAdmin.from('session_reminders')
        .delete().eq('session_id', sessionId).eq('reminder_type', 'email');
    }
    return { success: false, error: 'Failed to send reminder email' };
  }

  // Manual path: log the send afterwards (best-effort; ignore the duplicate-key
  // conflict that happens when one was already logged).
  if (!auto) {
    const { error: logErr } = await supabaseAdmin
      .from('session_reminders')
      .insert({ session_id: sessionId, reminder_type: 'email' });
    if (logErr && logErr.code !== '23505') {
      console.warn('[send-reminder] Could not log reminder:', logErr.message);
    }
  }

  console.log(`[send-reminder] Sent ${kind} reminder to ${client.email} for session ${sessionId}`);
  return { success: true, email: client.email };
}
