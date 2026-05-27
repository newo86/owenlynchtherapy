import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getAuthorizedClient();
  if (!client) {
    return NextResponse.json({ connected: false, events: [] }, { headers: noCache });
  }

  // Window: 4 weeks of events centred on (current week + weekOffset). The
  // dashboard can navigate back/forward through weeks; this fetch covers
  // the current view + 3 weeks beyond it in either direction.
  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0', 10) || 0;
  const weeks = Math.max(1, Math.min(12, parseInt(req.nextUrl.searchParams.get('weeks') ?? '4', 10) || 4));

  const viewStart = startOfWeek(new Date());
  viewStart.setDate(viewStart.getDate() + weekOffset * 7);
  const timeMin = viewStart.toISOString();
  const end = new Date(viewStart);
  end.setDate(end.getDate() + weeks * 7);
  const timeMax = end.toISOString();

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const events = (data.items ?? [])
      .filter(e => (e.start?.dateTime || e.start?.date) && (e.end?.dateTime || e.end?.date))
      .map(e => ({
        id: e.id ?? Math.random().toString(36),
        title: e.summary ?? '(untitled)',
        start: (e.start?.dateTime ?? e.start?.date)!,
        end: (e.end?.dateTime ?? e.end?.date)!,
        description: e.description ?? undefined,
        location: e.location ?? undefined,
        htmlLink: e.htmlLink ?? undefined,
      }));

    // Auto-cancel Supabase sessions whose GCal event was deleted.
    // Only affects sessions that have a gcal_event_id recorded.
    const gcalIds = new Set(events.map(e => e.id));
    const { data: trackedSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, gcal_event_id')
      .gte('session_date', timeMin)
      .lte('session_date', timeMax)
      .not('gcal_event_id', 'is', null)
      .neq('status', 'cancelled');

    if (trackedSessions && trackedSessions.length > 0) {
      const orphaned = trackedSessions
        .filter((s: { id: string; gcal_event_id: string }) => !gcalIds.has(s.gcal_event_id))
        .map((s: { id: string }) => s.id);
      if (orphaned.length > 0) {
        await supabaseAdmin
          .from('sessions')
          .update({ status: 'cancelled' })
          .in('id', orphaned);
        console.log('[admin/calendar] auto-cancelled', orphaned.length, 'session(s) removed from GCal');
      }
    }

    return NextResponse.json({ connected: true, events }, { headers: noCache });
  } catch (err: unknown) {
    console.error('[admin/calendar] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ connected: true, events: [], error: msg }, { status: 500, headers: noCache });
  }
}
