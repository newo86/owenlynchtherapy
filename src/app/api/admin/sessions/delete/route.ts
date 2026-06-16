import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteCalendarEvent } from '@/lib/googleOAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { session_id?: string; gcal_event_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id, gcal_event_id } = body;
  if (!session_id && !gcal_event_id) {
    return NextResponse.json({ error: 'session_id or gcal_event_id is required' }, { status: 400 });
  }

  // GCal-only delete: no Supabase session row, just remove the calendar event.
  if (!session_id && gcal_event_id) {
    await deleteCalendarEvent(gcal_event_id);
    console.log('[sessions/delete] deleted GCal-only event:', gcal_event_id);
    return NextResponse.json({ success: true }, { headers: noCache });
  }

  // Fetch the row before changing it so we can remove the GCal event and
  // tombstone any duplicate rows for the same slot.
  const { data: sessionRow } = await supabaseAdmin
    .from('sessions')
    .select('id, client_id, session_date, gcal_event_id')
    .eq('id', session_id!)
    .single();

  if (sessionRow?.gcal_event_id) {
    await deleteCalendarEvent(sessionRow.gcal_event_id);
  }

  // Soft-delete: mark the session 'cancelled' rather than hard-deleting it.
  // A hard delete leaves no trace, so the Google Calendar two-way sync
  // (/api/admin/calendar) would re-import the still-present recurring event
  // as a fresh 'scheduled' session — which then triggered reminder emails for
  // sessions the practitioner had deliberately removed. Keeping a cancelled
  // tombstone (same behaviour as a GCal-removed session) lets the importer
  // recognise the slot and refuse to resurrect it. Cancelled rows are already
  // filtered out of every active view, revenue total and the reminder cron.
  const cancel = { status: 'cancelled' as const };

  // Cancel the row itself plus any duplicate rows at the exact same
  // (client, time) slot — recurring-sync sometimes leaves a twin that would
  // otherwise stay 'scheduled' and still receive a reminder.
  let cancelled = 0;
  if (sessionRow?.client_id && sessionRow?.session_date) {
    const { data: cancelledRows, error: slotErr } = await supabaseAdmin
      .from('sessions')
      .update(cancel)
      .eq('client_id', sessionRow.client_id)
      .eq('session_date', sessionRow.session_date)
      .neq('status', 'cancelled')
      .select('id');
    if (slotErr) {
      console.error('[sessions/delete] Supabase error:', JSON.stringify(slotErr, null, 2));
      return NextResponse.json({ error: slotErr.message ?? 'Failed to delete session' }, { status: 500 });
    }
    cancelled = cancelledRows?.length ?? 0;
  } else {
    // Fallback: no slot info (shouldn't happen) — cancel just this id.
    const { error } = await supabaseAdmin.from('sessions').update(cancel).eq('id', session_id!);
    if (error) {
      console.error('[sessions/delete] Supabase error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message ?? 'Failed to delete session' }, { status: 500 });
    }
    cancelled = 1;
  }

  console.log('[sessions/delete] cancelled session(s):', session_id, '· rows:', cancelled);
  return NextResponse.json({ success: true, cancelled }, { headers: noCache });
}
