import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches } from '@/lib/adminAuth';
import { rateLimit } from '@/lib/rateLimit';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { promptLabel } from '@/lib/paymentPrompts';

// Read-only schedule snapshot for the practice-manager agent.
//
// Auth is a bearer token in SCHEDULE_READ_TOKEN only. The admin cookie is NOT
// accepted, and the token can read nothing but this route. Returns the least
// that is useful: when, a first-name-plus-initial label, status and whether it
// is marked paid. No emails, fees, notes, ids or formats.

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const DAY = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const token = process.env.SCHEDULE_READ_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Schedule snapshot is not configured' }, { status: 503, headers });
  }
  if (!bearerMatches(req, token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  if (!rateLimit('schedule-snapshot', 'token', 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const raw = req.nextUrl.searchParams.get('days');
  let days = 14;
  if (raw !== null) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      return NextResponse.json({ error: 'days must be a whole number from 1 to 31' }, { status: 400, headers });
    }
    days = n;
  }

  const now = Date.now();
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('session_date, status, payment_status, clients(full_name)')
    .gte('session_date', new Date(now - days * DAY).toISOString())
    .lte('session_date', new Date(now + days * DAY).toISOString())
    .order('session_date', { ascending: true });
  if (error) {
    console.error('[schedule-snapshot] query failed:', dbError(error));
    return NextResponse.json({ error: 'Failed to read the schedule' }, { status: 500, headers });
  }

  const sessions = (data ?? []).map(s => ({
    when: new Date(s.session_date as string).toISOString(),
    client: promptLabel({ full_name: (s.clients as unknown as { full_name: string } | null)?.full_name ?? '' }),
    status: s.status as string,
    payment: s.payment_status === 'paid' ? 'paid' as const : 'not marked paid' as const,
  }));

  return NextResponse.json(sessions, { headers });
}
