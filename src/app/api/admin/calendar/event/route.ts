import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteCalendarEvent, updateCalendarEvent } from '@/lib/googleOAuth';
import { localDublinToUtcIso } from '@/lib/dateUtils';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const VALID_FORMATS = ['in_person', 'online'];

const LOCATION_FOR = (format: string) => format === 'in_person'
  ? 'Insight Matters, 106 Capel Street, Dublin, D01 WY40'
  : 'https://doxy.me/owenlynchtherapy';

function unauthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  return !secret || authHeader !== `Bearer ${secret}`;
}

/**
 * POST — save edits to a Google Calendar event that has no (or an optional)
 * linked Supabase client. Always patches the Google Calendar event (title +
 * time, and location when a format is chosen). When a client_id is supplied
 * the event is "connected" by upserting a Supabase session row so it becomes a
 * fully tracked session; when client_id is blank the event stays a standalone
 * Google Calendar entry — that is intentionally fine.
 */
export async function POST(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    gcal_event_id: string;
    title: string;
    session_date: string;            // "YYYY-MM-DDTHH:MM" Dublin wall-clock
    session_format?: string;         // optional 'in_person' | 'online'
    fee?: number;                    // optional, euros
    client_id?: string | null;       // optional — links/creates a Supabase session
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { gcal_event_id, client_id } = body;
  const title = (body.title ?? '').trim();
  const wallClock = body.session_date;

  if (!gcal_event_id) return NextResponse.json({ error: 'gcal_event_id is required' }, { status: 400 });
  if (!title)         return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!wallClock)     return NextResponse.json({ error: 'session_date is required' }, { status: 400 });

  const format = typeof body.session_format === 'string' && VALID_FORMATS.includes(body.session_format)
    ? body.session_format
    : null;
  const location = format ? LOCATION_FOR(format) : undefined; // undefined ⇒ leave GCal location untouched

  // 1 — Update the Google Calendar event. updateCalendarEvent expects the
  // wall-clock string and re-attaches timeZone: 'Europe/Dublin', so the time
  // the admin typed is preserved exactly. Omitting `location` leaves any
  // existing location (e.g. on a personal event) in place.
  await updateCalendarEvent(gcal_event_id, {
    summary: title,
    location,
    startIso: wallClock,
    durationMinutes: 50,
  });

  // 2 — If a client was linked, upsert a Supabase session so the event becomes
  // a tracked session. Without a client the event remains standalone (no row).
  if (client_id) {
    // TIMEZONE: store the true UTC instant for the timestamptz column.
    const sessionDateUtc = localDublinToUtcIso(wallClock);
    const feeCents = typeof body.fee === 'number' && body.fee > 0 ? Math.round(body.fee * 100) : null;

    const { data: existingRows } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('gcal_event_id', gcal_event_id)
      .limit(1);
    const existing = existingRows?.[0];

    if (existing) {
      const patch: Record<string, unknown> = {
        client_id,
        session_date: sessionDateUtc,
      };
      if (format) { patch.session_format = format; patch.location = LOCATION_FOR(format); }
      if (feeCents !== null) patch.fee = feeCents;
      const { error } = await supabaseAdmin.from('sessions').update(patch).eq('id', existing.id);
      if (error) {
        console.error('[admin/calendar/event] session update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin.from('sessions').insert({
        client_id,
        session_date: sessionDateUtc,
        session_format: format ?? 'in_person',
        location: LOCATION_FOR(format ?? 'in_person'),
        fee: feeCents ?? 0,
        status: 'scheduled',
        payment_status: 'unpaid',
        notes: `Linked from Google Calendar: "${title}"`,
        gcal_event_id,
      });
      if (error) {
        console.error('[admin/calendar/event] session insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true }, { headers: noCache });
}

/**
 * DELETE — remove a Google Calendar event and any Supabase session row tracking
 * it. No client linking required; works for standalone GCal events too.
 */
export async function DELETE(req: NextRequest) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { gcal_event_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { gcal_event_id } = body;
  if (!gcal_event_id) {
    return NextResponse.json({ error: 'gcal_event_id is required' }, { status: 400 });
  }

  // Remove from Google Calendar (silent failure — Supabase is source of truth).
  await deleteCalendarEvent(gcal_event_id);

  // Remove any Supabase session(s) tracking this event, if a row exists.
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('gcal_event_id', gcal_event_id);

  if (error) {
    console.error('[admin/calendar/event] delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
