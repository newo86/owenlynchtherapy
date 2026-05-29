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

  // Fetch gcal_event_id before deleting so we can remove the GCal event too.
  const { data: sessionRow } = await supabaseAdmin
    .from('sessions')
    .select('gcal_event_id')
    .eq('id', session_id!)
    .single();

  if (sessionRow?.gcal_event_id) {
    await deleteCalendarEvent(sessionRow.gcal_event_id);
  }

  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', session_id!);

  if (error) {
    console.error('[sessions/delete] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to delete session' }, { status: 500 });
  }

  console.log('[sessions/delete] deleted session:', session_id);
  return NextResponse.json({ success: true }, { headers: noCache });
}
