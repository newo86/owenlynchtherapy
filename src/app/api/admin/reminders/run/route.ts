import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSessionReminder } from '@/lib/sendSessionReminder';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { reconcileCalendar } from '@/lib/calendarSync';
import { localDublinToUtcIso } from '@/lib/dateUtils';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL } from '@/lib/emailTemplates';
import { SITE_URL } from '@/practice.config';

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
// The run does a full Google Calendar reconcile plus sequential sends; the
// platform default timeout could kill it between a claim and its send, which
// would permanently burn that session's one reminder. Give it headroom.
export const maxDuration = 60;

// A normal day has a handful of sessions. If we ever see more candidates than
// this, treat it as a fault and send nothing — the circuit breaker that makes
// a mass-email physically impossible.
const MAX_PER_RUN = 25;

// TEMPORARY MANUAL PAUSE — set true to make the daily run send NOTHING.
// Turned on 13 Jul 2026 while ghost "scheduled" sessions were being cleaned up
// (they were emailing clients for sessions that weren't happening). Set back to
// false to resume automatic reminders once the database is tidy.
const REMINDERS_PAUSED = true;

// Persist the outcome of EVERY run — aborts included — so the dashboard
// health strip can show "reminders went out this morning" (or that they
// didn't) without anyone reading server logs. Best-effort: a logging failure
// must never affect the run itself.
async function recordRun(entry: {
  outcome: string;
  candidates?: number;
  sent?: number;
  skipped?: number;
  failed?: number;
  detail?: unknown;
}): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('reminder_runs').insert({
      outcome: entry.outcome,
      candidates: entry.candidates ?? 0,
      sent: entry.sent ?? 0,
      skipped: entry.skipped ?? 0,
      failed: entry.failed ?? 0,
      detail: entry.detail ?? null,
    });
    if (error) console.error('[reminders-cron] could not record run:', error.message);
  } catch (err) {
    console.error('[reminders-cron] could not record run:', err instanceof Error ? err.message : String(err));
  }
}

// Heads-up email to the practitioner when a run is held back, so silence always
// means "all good". Best-effort and routed through getResend(), so it respects
// the EMAILS_ENABLED kill-switch like every other email.
async function sendAbortAlert(reason: string, detail: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: "Heads-up: today's session reminders were held back",
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p>This morning's automatic reminder run did <strong>not</strong> send any emails — a safety check stopped it.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>${detail}</p>
        <p>No client received a reminder this morning. Please review today's sessions and send any needed reminders by hand from the dashboard:
        <a href="${SITE_URL}/admin/intake">${SITE_URL.replace("https://","")}/admin/intake</a></p>
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

  // MANUAL PAUSE — checked first, before anything can select or claim a
  // reminder. While paused the run does nothing and records why, so the
  // dashboard shows reminders were deliberately held rather than failing.
  if (REMINDERS_PAUSED) {
    console.warn('[reminders-cron] PAUSED: REMINDERS_PAUSED is true — selecting and sending nothing.');
    await recordRun({
      outcome: 'aborted:paused',
      detail: { message: 'Reminders are manually paused in code (REMINDERS_PAUSED).' },
    });
    return NextResponse.json({ ok: false, aborted: 'paused', sent: 0 }, { status: 200 });
  }

  const now = new Date();
  // Today's bounds in Dublin wall-clock, as UTC instants.
  const dublinDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' }); // YYYY-MM-DD
  const startOfToday = localDublinToUtcIso(`${dublinDate}T00:00`);
  const endOfToday = localDublinToUtcIso(`${dublinDate}T23:59`);

  // 0. KILL SWITCH — check up front, before anything can claim a reminder row.
  //    Previously a blocked send looked like a success (the resend stub returns
  //    no error), so runs during a switched-off window kept their claims and
  //    those sessions became permanently unremindable. Abort loudly instead.
  if (process.env.EMAILS_ENABLED !== 'true') {
    console.error('[reminders-cron] ABORT: EMAILS_ENABLED is not true — sending nothing.');
    await recordRun({
      outcome: 'aborted:kill-switch',
      detail: { message: 'EMAILS_ENABLED is not true; no reminders sent and no claims recorded.' },
    });
    return NextResponse.json({ ok: false, aborted: 'kill-switch', sent: 0 }, { status: 200 });
  }

  // 1. GCAL CHECK — refresh Supabase against the live calendar before sending.
  //    Fail-closed: if Google isn't connected or the sync errors, send nothing.
  const gcal = await getAuthorizedClient();
  if (!gcal) {
    console.error('[reminders-cron] ABORT: Google Calendar not connected — cannot verify sessions, sending nothing.');
    await sendAbortAlert(
      "Google Calendar isn't connected",
      "We couldn't check today's sessions against your calendar, so reminders were paused. Reconnect Google Calendar in the dashboard to resume automatic reminders.",
    );
    await recordRun({ outcome: 'aborted:google-not-connected' });
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
    await recordRun({ outcome: 'aborted:calendar-sync-failed', detail: { message: msg } });
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
    await recordRun({ outcome: 'error:candidates-query', detail: { message: error.message } });
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
    await recordRun({ outcome: 'aborted:exceeds-cap', candidates: unique.length });
    return NextResponse.json(
      { ok: false, aborted: 'exceeds-cap', candidates: unique.length, cap: MAX_PER_RUN, sent: 0 },
      { status: 200 },
    );
  }

  const results = { sent: 0, skipped: 0, failed: 0 };
  const details: Array<{ session_id: string; outcome: string }> = [];

  for (const s of unique) {
    // A thrown exception (misconfigured Resend key, network fault) must not
    // kill the run for the remaining candidates — and sendSessionReminder
    // releases its claim on failure so the session stays remindable.
    let result;
    try {
      result = await sendSessionReminder(s.id, { skipIfAlreadySent: true });
    } catch (err) {
      result = { success: false as const, error: err instanceof Error ? err.message : String(err) };
    }
    if (result.success) {
      results.sent += 1;
      details.push({ session_id: s.id, outcome: 'sent' });
    } else if (result.skipped) {
      results.skipped += 1;
      details.push({ session_id: s.id, outcome: `skipped: ${result.error}` });
    } else {
      results.failed += 1;
      details.push({ session_id: s.id, outcome: `failed: ${result.error}` });
    }
  }

  console.log(`[reminders-cron] today ${dublinDate}: candidates ${unique.length}, sent ${results.sent}, skipped ${results.skipped}, failed ${results.failed}`);
  await recordRun({
    outcome: results.failed > 0 ? 'completed:with-failures' : 'completed',
    candidates: unique.length,
    ...results,
    detail: details,
  });

  // Individual send failures used to be invisible (only full aborts alerted).
  // The July 2026 outage — every send failing for days — went unnoticed
  // because of exactly that gap.
  if (results.failed > 0) {
    await sendAbortAlert(
      `${results.failed} of today's ${unique.length} reminder${unique.length === 1 ? '' : 's'} failed to send`,
      `Sent ${results.sent}, skipped ${results.skipped}, failed ${results.failed}. The failed clients did NOT get a reminder — please send those by hand from the dashboard and check the reminder health banner for details.`,
    );
  }

  return NextResponse.json({ ok: true, date: dublinDate, candidates: unique.length, ...results, details });
}
