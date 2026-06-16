import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';
import { reconcileCalendar } from '@/lib/calendarSync';

// Background calendar reconciliation. Called by Vercel Cron every few minutes
// (see vercel.json) so Google Calendar deletions and additions propagate into
// the dashboard even when no one has it open — and so the reminder cron always
// works from an up-to-date schedule. Also callable manually with the admin
// session cookie. Read-only toward Google; only Supabase is updated.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || requireAdmin(req) === null;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getAuthorizedClient();
  if (!client) {
    return NextResponse.json({ ok: true, connected: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Reconcile last week → 10 weeks ahead (matches the dashboard's broad window).
  const start = new Date(startOfWeek(new Date()));
  start.setDate(start.getDate() - 7);
  const end = new Date(startOfWeek(new Date()));
  end.setDate(end.getDate() + 10 * 7);

  try {
    const outcome = await reconcileCalendar(client, start.toISOString(), end.toISOString());
    console.log(`[calendar-sync-cron] imported ${outcome.imported}, cancelled ${outcome.cancelled}, conflicts ${outcome.conflictsFixed}`);
    return NextResponse.json(
      { ok: true, connected: true, imported: outcome.imported, cancelled: outcome.cancelled, conflictsFixed: outcome.conflictsFixed },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    console.error('[calendar-sync-cron] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
