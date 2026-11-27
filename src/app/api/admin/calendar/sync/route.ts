import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';
import { reconcileCalendar } from '@/lib/calendarSync';
import { loadDrift } from '@/lib/calendarDrift';
import { pushSessionToGoogle } from '@/lib/calendarFix';
import { withGoogle } from '@/lib/googleSessionEvents';
import { applyGoogleTruth } from '@/lib/googleTruth';

// Background calendar upkeep, called by Vercel Cron every few minutes (see
// vercel.json) and callable by hand with the admin session cookie.
//
// GOOGLE CALENDAR LEADS the schedule (since 27 Nov 2026, Owen's choice). This job:
//   1. ties sessions to the Google events they already match (bookkeeping),
//   2. RETRIES a booking whose write to Google failed: a session made in the
//      app in the last week that still has no Google event gets one, and
//   3. makes the app follow Google: sessions added, moved or deleted in Google
//      are added, moved or cancelled in the app, with the safety rules in
//      src/lib/googleTruth.ts (paid sessions and app cancellations are left for
//      a tap; a burst of deletions is held; every change is logged).

export const dynamic = 'force-dynamic';

/** Most events this job will create in one run (a runaway guard). */
const MAX_RETRIES_PER_RUN = 10;

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || (await requireAdmin(req)) === null;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getAuthorizedClient();
  if (!client) {
    return NextResponse.json({ ok: true, connected: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Last week → 10 weeks ahead (matches the dashboard's broad window).
  const start = new Date(startOfWeek(new Date()));
  start.setDate(start.getDate() - 7);
  const end = new Date(startOfWeek(new Date()));
  end.setDate(end.getDate() + 10 * 7);

  try {
    const { events, truncated, linked } = await reconcileCalendar(client, start.toISOString(), end.toISOString());
    const drift = await loadDrift(events, truncated, end);

    let retried = 0;
    const toRetry = (drift ?? []).filter(d => d.kind === 'not_in_google' && d.retry && d.sessionId).slice(0, MAX_RETRIES_PER_RUN);
    if (toRetry.length > 0) {
      const res = await withGoogle(async cal => {
        for (const d of toRetry) {
          const r = await pushSessionToGoogle(cal, d.sessionId!);
          if (r.ok) retried += 1;
        }
      });
      if (!res.ok) console.error('[calendar-sync-cron] retry failed:', res.reason, res.message ?? '');
    }

    // 3. Google Calendar leads: make the app follow it (src/lib/googleTruth.ts).
    //    Skipped when Google's answer was cut short (drift is null then).
    let followed = { applied: 0, held: 0, failed: 0 };
    if (drift && drift.length) {
      const res = await withGoogle(cal => applyGoogleTruth(cal, drift));
      if (res.ok) followed = res.value;
      else console.error('[calendar-sync-cron] follow-Google failed:', res.reason, res.message ?? '');
    }

    console.log(`[calendar-sync-cron] linked ${linked}, retried ${retried}, followed ${followed.applied} (held ${followed.held}, failed ${followed.failed}), differences ${drift?.length ?? 'unknown'}`);
    return NextResponse.json(
      { ok: true, connected: true, linked, retried, followed, differences: drift?.length ?? null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    console.error('[calendar-sync-cron] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
