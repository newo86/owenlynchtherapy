import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSessionReminder } from '@/lib/sendSessionReminder';

// Reminder run. Called by Vercel Cron every hour (see vercel.json); also
// callable manually from the dashboard with the admin session cookie.
//
// Each run emails a type-aware reminder for every *scheduled* session starting
// within the next 24 hours that has not already had a reminder logged. Running
// hourly with a rolling 24-hour window means a session booked well in advance
// is reminded ~24 hours before it starts (at the first run that sees it inside
// the window), and a last-minute booking still gets one reminder rather than
// being missed.
//
// Reminders are gated four ways so a removed session can never be emailed:
//   1. this query only selects status = 'scheduled' (cancelled/attended/
//      no-show are excluded);
//   2. duplicate rows for the same client+time slot are collapsed to one;
//   3. sendSessionReminder re-fetches the row and re-checks status before
//      sending;
//   4. session_reminders dedupe prevents a second email for the same session.

export const dynamic = 'force-dynamic';

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || requireAdmin(req) === null;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + WINDOW_MS);

  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, session_date, client_id, status')
    .eq('status', 'scheduled')
    .gt('session_date', now.toISOString())
    .lte('session_date', horizon.toISOString())
    .order('session_date', { ascending: true });

  if (error) {
    console.error('[reminders-cron] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  // Collapse duplicate rows (recurring-sync artefact) so a slot with a twin
  // row gets exactly one reminder.
  const seen = new Set<string>();
  const unique: Array<{ id: string; session_date: string; client_id: string; status: string }> = [];
  for (const s of sessions ?? []) {
    const key = `${s.client_id}@${s.session_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
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

  console.log(`[reminders-cron] window→${horizon.toISOString()}: sent ${results.sent}, skipped ${results.skipped}, failed ${results.failed}`);
  return NextResponse.json({ ok: true, horizon: horizon.toISOString(), ...results, details });
}
