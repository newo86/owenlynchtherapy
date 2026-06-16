import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';
import { reconcileCalendar } from '@/lib/calendarSync';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const client = await getAuthorizedClient();
  if (!client) {
    return NextResponse.json({ connected: false, events: [] }, { headers: noCache });
  }

  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0', 10) || 0;
  const weeks = Math.max(1, Math.min(12, parseInt(req.nextUrl.searchParams.get('weeks') ?? '4', 10) || 4));

  // Window the dashboard wants to DISPLAY: the viewed week + a few weeks beyond.
  const viewStart = startOfWeek(new Date());
  viewStart.setDate(viewStart.getDate() + weekOffset * 7);
  const viewEnd = new Date(viewStart);
  viewEnd.setDate(viewEnd.getDate() + weeks * 7);

  // Window we RECONCILE: always a broad forward range (last week → 10 weeks
  // ahead) regardless of which week is being viewed, plus the viewed window if
  // it reaches further out. This is why a Google-side deletion now propagates
  // even if the practitioner is looking at a different week than the change.
  const reconStart = new Date(startOfWeek(new Date()));
  reconStart.setDate(reconStart.getDate() - 7);
  const reconEnd = new Date(startOfWeek(new Date()));
  reconEnd.setDate(reconEnd.getDate() + 10 * 7);
  const timeMin = (viewStart < reconStart ? viewStart : reconStart).toISOString();
  const timeMax = (viewEnd > reconEnd ? viewEnd : reconEnd).toISOString();

  try {
    const { events } = await reconcileCalendar(client, timeMin, timeMax);

    // Return only the viewed window for display.
    const viewMinMs = viewStart.getTime();
    const viewMaxMs = viewEnd.getTime();
    const display = events.filter(e => {
      const t = new Date(e.start).getTime();
      return t >= viewMinMs && t < viewMaxMs;
    });

    return NextResponse.json({ connected: true, events: display }, { headers: noCache });
  } catch (err: unknown) {
    console.error('[admin/calendar] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ connected: true, events: [], error: msg }, { status: 500, headers: noCache });
  }
}
