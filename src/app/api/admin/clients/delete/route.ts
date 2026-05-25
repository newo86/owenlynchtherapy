import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteCalendarEvent } from '@/lib/googleOAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// POST /api/admin/clients/delete  body: { client_id: string }
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { client_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { client_id } = body;
  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  console.log('[clients/delete] cascading delete for client:', client_id);

  // 1. Fetch all sessions BEFORE deleting so we have their gcal_event_ids.
  //    If the gcal_event_id column hasn't been migrated yet, fetchErr will fire —
  //    we log a warning and skip GCal cleanup rather than blocking the delete.
  const { data: sessions, error: fetchErr } = await supabaseAdmin
    .from('sessions')
    .select('id, gcal_event_id')
    .eq('client_id', client_id);

  let uniqueEventIds: string[] = [];
  if (fetchErr) {
    console.warn('[clients/delete] could not read gcal_event_ids (migration pending?):', fetchErr.message);
  } else {
    // 2. Delete every Google Calendar event linked to this client's sessions.
    //    Multiple sessions in a recurring series share one gcal_event_id, so
    //    deduplicate before hitting the API. Deleting the series event removes
    //    all instances at once. Failures are logged but don't abort the delete.
    uniqueEventIds = [
      ...new Set(
        (sessions ?? [])
          .map(s => (s as { gcal_event_id?: string | null }).gcal_event_id)
          .filter((id): id is string => !!id),
      ),
    ];
    console.log('[clients/delete] removing', uniqueEventIds.length, 'gcal event(s)');
    await Promise.all(uniqueEventIds.map(id => deleteCalendarEvent(id)));
  }

  // 3. Delete child rows to satisfy FK constraints.
  const sessionsDel = await supabaseAdmin.from('sessions').delete().eq('client_id', client_id);
  if (sessionsDel.error) {
    console.error('[clients/delete] sessions error:', sessionsDel.error);
    return NextResponse.json({ error: sessionsDel.error.message }, { status: 500 });
  }

  const submissionsDel = await supabaseAdmin.from('intake_submissions').delete().eq('client_id', client_id);
  if (submissionsDel.error) {
    console.error('[clients/delete] submissions error:', submissionsDel.error);
    // Fall through — orphan row is acceptable.
  }

  const tokensDel = await supabaseAdmin.from('intake_tokens').delete().eq('client_id', client_id);
  if (tokensDel.error) {
    console.error('[clients/delete] tokens error:', tokensDel.error);
  }

  // 4. Delete the client.
  const { error } = await supabaseAdmin.from('clients').delete().eq('id', client_id);
  if (error) {
    console.error('[clients/delete] client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, gcal_events_removed: uniqueEventIds.length }, { headers: noCache });
}
