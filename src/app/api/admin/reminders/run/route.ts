import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSessionReminder } from '@/lib/sendSessionReminder';
import { localDublinToUtcIso } from '@/lib/dateUtils';

// Daily reminder run. Called by Vercel Cron each morning (see vercel.json);
// also callable manually from the dashboard with the admin session cookie.
// Sends a type-aware reminder for every scheduled session happening today
// (Dublin time) that hasn't already had a reminder logged.

export const dynamic = 'force-dynamic';

function dublinDateString(d: Date): string {
  // en-CA gives YYYY-MM-DD, which is what localDublinToUtcIso expects.
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
}

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || requireAdmin(req) === null;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Today's Dublin calendar day, expressed as a UTC window.
  const now = new Date();
  const today = dublinDateString(now);
  const tomorrow = dublinDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const windowStart = localDublinToUtcIso(`${today}T00:00`);
  const windowEnd = localDublinToUtcIso(`${tomorrow}T00:00`);

  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, session_date, status')
    .eq('status', 'scheduled')
    .gte('session_date', windowStart)
    .lt('session_date', windowEnd)
    .order('session_date', { ascending: true });

  if (error) {
    console.error('[reminders-cron] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  const results = { sent: 0, skipped: 0, failed: 0 };
  const details: Array<{ session_id: string; outcome: string }> = [];

  for (const s of sessions ?? []) {
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

  console.log(`[reminders-cron] ${today}: sent ${results.sent}, skipped ${results.skipped}, failed ${results.failed}`);
  return NextResponse.json({ ok: true, date: today, ...results, details });
}
