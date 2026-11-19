import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek } from '@/lib/dateUtils';
import { fetchCalendarEvents } from '@/lib/calendarSync';
import { loadDrift } from '@/lib/calendarDrift';
import { applyDriftChoice, CHOICES, type FixChoice } from '@/lib/calendarFix';
import { withGoogle } from '@/lib/googleSessionEvents';

// Apply the practitioner's choice for ONE difference between the app and
// Google Calendar. The browser sends only the difference's key and a choice;
// the server recomputes the differences from the live calendar and database
// and acts on the match, so a request can never name an arbitrary event or
// session. Admin session required.

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store, no-cache' };
const ALL_CHOICES = new Set<string>(Object.values(CHOICES).flat());

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { key?: unknown; choice?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const key = typeof body.key === 'string' && body.key.length <= 200 ? body.key : null;
  const choice = typeof body.choice === 'string' && ALL_CHOICES.has(body.choice) ? (body.choice as FixChoice) : null;
  if (!key || !choice) return NextResponse.json({ error: 'key and a valid choice are required' }, { status: 400 });

  const auth = await getAuthorizedClient();
  if (!auth) return NextResponse.json({ ok: false, message: "Google Calendar isn't connected." }, { status: 409, headers: noCache });

  // Same window the dashboard uses: last week → 10 weeks ahead.
  const start = new Date(startOfWeek(new Date()));
  start.setDate(start.getDate() - 7);
  const end = new Date(startOfWeek(new Date()));
  end.setDate(end.getDate() + 10 * 7);

  try {
    const { events, truncated } = await fetchCalendarEvents(auth, start.toISOString(), end.toISOString());
    const drift = await loadDrift(events, truncated, end);
    if (!drift) {
      return NextResponse.json({ ok: false, message: "Couldn't check the calendar just now. Try again in a moment." }, { status: 503, headers: noCache });
    }
    const item = drift.find(d => d.key === key);
    if (!item) {
      // Already resolved (or changed) since the list was drawn.
      return NextResponse.json({ ok: false, resolved: true, message: 'That one has already changed. The list is refreshing.' }, { status: 200, headers: noCache });
    }
    if (!CHOICES[item.kind].includes(choice)) {
      return NextResponse.json({ error: 'That choice does not apply to this difference' }, { status: 400 });
    }

    const res = await withGoogle(cal => applyDriftChoice(cal, item, choice));
    if (!res.ok) {
      const message = res.reason === 'not_connected'
        ? "Google Calendar isn't connected."
        : "Google Calendar didn't accept that. Nothing was changed; try again in a moment.";
      return NextResponse.json({ ok: false, message }, { status: 502, headers: noCache });
    }
    console.log('[calendar/fix]', item.kind, choice, res.value.ok ? 'ok' : 'declined');
    return NextResponse.json(res.value, { headers: noCache });
  } catch (err) {
    console.error('[calendar/fix] error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, message: "Something went wrong. Nothing was changed." }, { status: 500, headers: noCache });
  }
}
