import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSessionReminder } from '@/lib/sendSessionReminder';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { reconcileCalendar } from '@/lib/calendarSync';
import { localDublinToUtcIso } from '@/lib/dateUtils';
import { getResend } from '@/lib/resend';

// Daily reminder run. Called by Vercel Cron each morning (see vercel.json);
// also callable manually with the admin session cookie.
//
// Sends ONE reminder, the MORNING OF the session, for each scheduled session
// happening TODAY (Europe/Dublin) — no rolling multi-day window. Layers of
// protection so the duplicate-email incident can never recur:
//
//   1. GCAL CHECK FIRST — reconcileCalendar() refreshes Supabase against the
//      live Google Calendar (cancels sessions removed from GCal, fixes moved
//      times). If Google can't be reached we ABORT and send nothing, so we
//      never email about a session that may have changed.
//   2. ONE-PER-SESSION-EVER — sendSessionReminder claims a session_reminders
//      row (UNIQUE constraint) before sending; a duplicate claim can't send.
//   3. HARD CAP — if a run ever finds more than MAX_PER_RUN candidates,
//      something is wrong; we abort and send NONE rather than risk a blast.
//   4. KILL SWITCH — getResend() still honours EMAILS_ENABLED.

export const dynamic = 'force-dynamic';

// A normal day has a handful of sessions. If we ever see more candidates than
// this, treat it as a fault and send nothing — the circuit breaker that makes
// a mass-email physically impossible.
const MAX_PER_RUN = 25;

// Heads-up email to the practitioner when a run is held back, so silence always
// means "all good". Best-effort and routed through getResend(), so it respects
// the EMAILS_ENABLED kill-switch like every other email.
async function sendAbortAlert(reason: string, detail: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
      to: 'info@owenlynchtherapy.com',
      subject: "Heads-up: today's session reminders were held back",
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p>This morning's automatic reminder run did <strong>not</strong> send any emails — a safety check stopped it.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>${detail}</p>
        <p>No client received a reminder this morning. Please review today's sessions and send any needed reminders by hand from the dashboard:
        <a href="https://owenlynchtherapy.com/admin/intake">owenlynchtherapy.com/admin/intake</a></p>
      </div>`,
    });
  } catch (err) {
    console.error('[reminders-cron] failed to send abort alert:', err instanceof Error ? err.message : String(err));
  }
}

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || requireAdmin(req) === null;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // Today's bounds in Dublin wall-clock, as UTC instants.
  const dublinDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' }); // YYYY-MM-DD
  const startOfToday = localDublinToUtcIso(`${dublinDate}T00:00`);
  const endOfToday = localDublinToUtcIso(`${dublinDate}T23:59`);

  // 1. GCAL CHECK — refresh Supabase against the live calendar before sending.
  //    Fail-closed: if Google isn't connected or the sync errors, send nothing.
  const gcal = await getAuthorizedClient();
  if (!gcal) {
    console.error('[reminders-cron] ABORT: Google Calendar not connected — cannot verify sessions, sending nothing.');
    await sendAbortAlert(
      "Google Calendar isn't connected",
      "We couldn't check today's sessions against your calendar, so reminders were paused. Reconnect Google Calendar in the dashboard to resume automatic reminders.",
    );
    return NextResponse.json(
      { ok: false, aborted: 'google-not-connected', sent: 0 },
      { status: 200 },
    );
  }
  try {
    const outcome = await reconcileCalendar(gcal, startOfToday, endOfToday);
    console.log(`[reminders-cron] calendar synced: imported ${outcome.imported}, cancelled ${outcome.cancelled}, conflictsFixed ${outcome.conflictsFixed}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reminders-cron] ABORT: calendar sync failed — sending nothing:', msg);
    await sendAbortAlert(
      "Couldn't sync with Google Calendar",
      `We couldn't reach Google Calendar to verify today's sessions, so reminders were paused. (Technical detail: ${msg})`,
    );
    return NextResponse.json(
      { ok: false, aborted: 'calendar-sync-failed', sent: 0 },
      { status: 200 },
    );
  }

  // 2. Select TODAY's still-scheduled sessions from now onward (post-sync).
  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, session_date, client_id, status')
    .eq('status', 'scheduled')
    .gt('session_date', now.toISOString())
    .lte('session_date', endOfToday)
    .order('session_date', { ascending: true });

  if (error) {
    console.error('[reminders-cron] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  // Collapse duplicate rows (recurring-sync artefact) so a slot with a twin
  // row gets exactly one reminder.
  const seen = new Set<string>();
  const unique: Array<{ id: string; session_date: string; client_id: string }> = [];
  for (const s of sessions ?? []) {
    const key = `${s.client_id}@${s.session_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ id: s.id as string, session_date: s.session_date as string, client_id: s.client_id as string });
  }

  // 3. CIRCUIT BREAKER — never blast. If the candidate count is implausibly
  //    high, something is wrong; abort and send nothing.
  if (unique.length > MAX_PER_RUN) {
    console.error(`[reminders-cron] ABORT: ${unique.length} candidates exceeds cap ${MAX_PER_RUN} — sending nothing.`);
    await sendAbortAlert(
      'Unusually high number of reminders',
      `The run found ${unique.length} sessions to remind today, which is above the safety limit of ${MAX_PER_RUN}. That's unexpected, so nothing was sent. Please check today's sessions in the dashboard.`,
    );
    return NextResponse.json(
      { ok: false, aborted: 'exceeds-cap', candidates: unique.length, cap: MAX_PER_RUN, sent: 0 },
      { status: 200 },
    );
  }

  const results = { sent: 0, skipped: 0, failed: 0 };
  const details: Array<{ session_id: string; outcome: string }> = [];

  for (const s of unique) {
    const result = await sendSessionReminder(s.id, { skipIfAlreadySent: true });
    if (result.success) {
      results.sent += 1;
      details.push({ session_id: s.id, outcome: `sent to ${result.email}` });
    } else if (result.skipped) {
      results.skipped += 1;
      details.push({ session_id: s.id, outcome: `skipped: ${result.error}` });
    } else {
      results.failed += 1;
      details.push({ session_id: s.id, outcome: `failed: ${result.error}` });
    }
  }

  console.log(`[reminders-cron] today ${dublinDate}: candidates ${unique.length}, sent ${results.sent}, skipped ${results.skipped}, failed ${results.failed}`);
  return NextResponse.json({ ok: true, date: dublinDate, candidates: unique.length, ...results, details });
}
