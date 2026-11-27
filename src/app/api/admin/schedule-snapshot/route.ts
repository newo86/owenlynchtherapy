import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches } from '@/lib/adminAuth';
import { rateLimit, isTokenBlocked, trackTokenFailure } from '@/lib/rateLimit';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { fetchCalendarEvents } from '@/lib/calendarSync';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { promptLabel } from '@/lib/paymentPrompts';
import { busyBlocks, snapshotLabel } from '@/lib/scheduleSnapshot';

// Read-only schedule snapshot for the practice-manager agent.
//
// Auth is a bearer token in SCHEDULE_READ_TOKEN only (at least 32 characters,
// or the route refuses to run). The admin cookie is NOT accepted, and the
// token can read nothing but this route. Failed attempts are rate-limited per
// IP before the token is even compared.
//
// Returns the least that is useful:
//   sessions: when, a first-name-plus-initial label, status, paid or not.
//   busy:     start/end of Google Calendar events that are NOT a session
//             (so the agent can see what else is in the diary). Times only:
//             no titles, descriptions, attendees, locations or ids.
// No emails, fees, notes, ids or formats. If Google can't be read, busy is []
// and busyUnavailable is true; no error detail is ever returned.

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'no-store' };
const DAY = 24 * 60 * 60 * 1000;
const MIN_TOKEN_LENGTH = 32;

function clientIp(req: NextRequest): string {
  // x-real-ip is set by Vercel; the first x-forwarded-for entry is caller-controlled.
  return req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function GET(req: NextRequest) {
  const token = process.env.SCHEDULE_READ_TOKEN;
  if (!token || token.length < MIN_TOKEN_LENGTH) {
    return NextResponse.json({ error: 'Schedule snapshot is not configured' }, { status: 503, headers });
  }
  const ip = clientIp(req);
  if (isTokenBlocked(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }
  if (!bearerMatches(req, token)) {
    trackTokenFailure(ip);
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
    .select('session_date, status, payment_status, gcal_event_id, clients(full_name)')
    .gte('session_date', new Date(now - days * DAY).toISOString())
    .lte('session_date', new Date(now + days * DAY).toISOString())
    .order('session_date', { ascending: true });
  if (error) {
    console.error('[schedule-snapshot] query failed:', dbError(error));
    return NextResponse.json({ error: 'Failed to read the schedule' }, { status: 500, headers });
  }

  const sessions = (data ?? []).map(s => ({
    when: new Date(s.session_date as string).toISOString(),
    client: snapshotLabel(promptLabel({ full_name: (s.clients as unknown as { full_name: string } | null)?.full_name ?? '' })),
    status: s.status as string,
    payment: s.payment_status === 'paid' ? 'paid' as const : 'not marked paid' as const,
  }));

  // Everything else in the diary, times only. Never an error that leaks detail.
  let busy: Array<{ start: string; end: string }> = [];
  let busyUnavailable = false;
  try {
    const auth = await getAuthorizedClient();
    if (!auth) {
      busyUnavailable = true;
    } else {
      const { events, truncated } = await fetchCalendarEvents(
        auth, new Date(now - days * DAY).toISOString(), new Date(now + days * DAY).toISOString(),
      );
      if (truncated) {
        busyUnavailable = true;
      } else {
        const live = (data ?? [])
          .filter(s => s.status !== 'cancelled')
          .map(s => ({ gcal_event_id: (s.gcal_event_id as string | null) ?? null }));
        const { data: active } = await supabaseAdmin.from('clients').select('id, full_name').eq('status', 'active');
        busy = busyBlocks(events, live, (active ?? []) as Array<{ id: string; full_name: string }>);
      }
    }
  } catch (err) {
    console.error('[schedule-snapshot] calendar read failed:', err instanceof Error ? err.message : 'unknown');
    busy = [];
    busyUnavailable = true;
  }

  return NextResponse.json(busyUnavailable ? { sessions, busy: [], busyUnavailable: true } : { sessions, busy }, { headers });
}
