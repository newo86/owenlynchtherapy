import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';

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

  // Window: from start of current week through 28 days out (covers 4 weeks of calendar nav)
  const weekStart = startOfWeek(new Date());
  const timeMin = weekStart.toISOString();
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 28);
  const timeMax = end.toISOString();

  // Allow ?weeks=N to extend if needed
  const weeksParam = req.nextUrl.searchParams.get('weeks');
  if (weeksParam) {
    const weeks = Math.max(1, Math.min(12, parseInt(weeksParam, 10) || 4));
    end.setTime(weekStart.getTime());
    end.setDate(end.getDate() + weeks * 7);
  }

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

    return NextResponse.json({ connected: true, events }, { headers: noCache });
  } catch (err: unknown) {
    console.error('[admin/calendar] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ connected: true, events: [], error: msg }, { status: 500, headers: noCache });
  }
}
