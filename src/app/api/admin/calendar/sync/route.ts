import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';
import { reconcileCalendar } from '@/lib/calendarSync';
import { loadDrift } from '@/lib/calendarDrift';
import { pushSessionToGoogle } from '@/lib/calendarFix';
import { withGoogle, type CalLike } from '@/lib/googleSessionEvents';
import { followGoogle } from '@/lib/followGoogle';
import { supabaseFollowStore, sendFollowHeldAlert } from '@/lib/followGoogleStore';
import { inPersonAddressFor } from '@/lib/emailTemplates';
import { google } from 'googleapis';

// Background calendar upkeep, called by Vercel Cron every few minutes (see
// vercel.json) and callable by hand with the admin session cookie.
//
// The APP is the source of truth for the schedule; Google Calendar mirrors it.
// This job does three things:
//   1. ties sessions to the Google events they already match (bookkeeping),
//   2. FOLLOWS GOOGLE for the few changes the app copies by itself (27 Nov
//      2026, src/lib/followGoogle.ts): an occurrence or a whole series deleted
//      in Google cancels the sessions tied to it by id, and a series' repeat
//      changed weekly <-> every N weeks changes its frequency. Future
//      scheduled sessions only; never by name; never writes to Google or
//      emails a client; capped, recorded and undoable from the dashboard; and
//   3. RETRIES a booking whose write to Google failed: a session made in the
//      app in the last week that still has no Google event gets one.
// Anything else that differs (a time changed in Google, an event Google has
// that the app doesn't) is left for the practitioner to resolve in the
// dashboard, never silently "fixed" in either direction.

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

    // Read-only use of Google here: the follow step never writes to it.
    let followed = 'unknown';
    try {
      const outcome = await followGoogle({
        cal: google.calendar({ version: 'v3', auth: client }) as unknown as CalLike,
        events, truncated, now: new Date(), windowEnd: end,
        store: supabaseFollowStore,
        alert: sendFollowHeldAlert,
        addressFor: inPersonAddressFor,
      });
      followed = outcome.status === 'applied'
        ? `applied ${outcome.result.applied} (cancelled ${outcome.result.cancelled}, added ${outcome.result.added})`
        : outcome.status === 'held' ? `held back (${outcome.wouldCancel} would be cancelled)`
        : outcome.status === 'skipped' ? `skipped (${outcome.reason})` : 'nothing';
      if (outcome.status === 'applied' && outcome.result.errors.length) console.error('[calendar-sync-cron] follow errors:', outcome.result.errors);
    } catch (err) {
      console.error('[calendar-sync-cron] follow failed:', err instanceof Error ? err.message : err);
    }

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

    console.log(`[calendar-sync-cron] linked ${linked}, followed ${followed}, retried ${retried}, differences ${drift?.length ?? 'unknown'}`);
    return NextResponse.json(
      { ok: true, connected: true, linked, followed, retried, differences: drift?.length ?? null },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    console.error('[calendar-sync-cron] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
