import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';

// The client's active ongoing series (weekly / every N weeks with no end), for
// the client record's "How often" control. Admin session required.

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const clientId = req.nextUrl.searchParams.get('client_id');
  if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('session_series')
    .select('id, interval_weeks, anchor_at, gcal_event_id')
    .eq('client_id', clientId).eq('active', true)
    .order('created_at', { ascending: false }).limit(1);
  if (error) {
    console.error('[sessions/series] read failed:', dbError(error));
    return NextResponse.json({ series: null }, { headers: noCache });
  }
  const s = data?.[0];
  return NextResponse.json({
    series: s && s.gcal_event_id ? { id: s.id, interval_weeks: s.interval_weeks, anchor_at: s.anchor_at } : null,
  }, { headers: noCache });
}
