import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { updateCalendarEvent } from '@/lib/googleOAuth';
import { localDublinToUtcIso } from '@/lib/dateUtils';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const VALID_FORMATS = ['in_person', 'online'];

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: {
    gcal_event_id: string;
    title: string;
    session_date: string;    // "YYYY-MM-DDTHH:MM" Dublin wall-clock
    session_format?: string;
    fee?: number;            // cents (optional, used when creating Supabase session)
    client_id?: string;      // optional — creates Supabase session when present
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { gcal_event_id, title, session_date, client_id } = body;
  if (!gcal_event_id || !title?.trim() || !session_date) {
    return NextResponse.json({ error: 'gcal_event_id, title, and session_date are required' }, { status: 400 });
  }

  const format = VALID_FORMATS.includes(body.session_format ?? '') ? body.session_format! : 'in_person';
  const location = format === 'in_person'
    ? 'Insight Matters, 106 Capel Street, Dublin, D01 WY40'
    : 'https://doxy.me/owenlynchtherapy';

  // Update the Google Calendar event.
  // session_date is "YYYY-MM-DDTHH:MM" Dublin wall-clock — passed directly to
  // updateCalendarEvent which sends it with timeZone: 'Europe/Dublin'.
  try {
    await updateCalendarEvent(gcal_event_id, {
      summary: title.trim(),
      location,
      description: format === 'online' ? 'Join: https://doxy.me/owenlynchtherapy' : undefined,
      startIso: session_date,
      durationMinutes: 50,
    });
  } catch (calErr) {
    console.error('[gcal-event/update] GCal error:', calErr);
    // Non-fatal — we still try to create the Supabase session if requested.
  }

  // Optionally link to a client by creating a Supabase session row.
  let newSession: { id: string } | null = null;
  if (client_id) {
    // Convert Dublin wall-clock → UTC for Supabase timestamptz storage.
    const utcIso = localDublinToUtcIso(session_date);
    const fee = typeof body.fee === 'number' ? Math.round(body.fee) : 0;

    const basePayload = {
      client_id,
      session_date: utcIso,
      session_format: format,
      location,
      fee,
      status: 'scheduled',
      payment_status: 'unpaid',
      notes: body.notes?.trim() ?? null,
    };

    // Try to store the gcal_event_id so future two-way sync can match this
    // session to its calendar event. If that column hasn't been migrated yet
    // (PostgREST reports it missing / a stale schema cache), fall back to
    // creating the session WITHOUT it so linking the client still succeeds —
    // the calendar then falls back to name-matching. Run the
    // sessions_gcal_event_id.sql migration in Supabase to restore full sync.
    let inserted = await supabaseAdmin
      .from('sessions')
      .insert({ ...basePayload, gcal_event_id })
      .select('id')
      .single();

    const missingCol = inserted.error
      && /gcal_event_id|schema cache/i.test(inserted.error.message ?? '');
    if (missingCol) {
      console.warn('[gcal-event/update] gcal_event_id column missing — run sessions_gcal_event_id.sql. Linking client without it.');
      inserted = await supabaseAdmin
        .from('sessions')
        .insert(basePayload)
        .select('id')
        .single();
    }

    if (inserted.error) {
      console.error('[gcal-event/update] session insert error:', inserted.error);
      return NextResponse.json({ error: inserted.error.message ?? 'Failed to create session' }, { status: 500 });
    }
    newSession = inserted.data as { id: string };
  }

  console.log('[gcal-event/update] updated GCal event:', gcal_event_id, client_id ? `→ session: ${newSession?.id}` : '(unlinked)');
  return NextResponse.json({ ok: true, session: newSession }, { headers: noCache });
}
