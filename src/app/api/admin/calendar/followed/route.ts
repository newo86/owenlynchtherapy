import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { promptLabel } from '@/lib/paymentPrompts';
import { toFollowedItems, undoFollowedChange, UNDO_DAYS } from '@/lib/followGoogle';
import { supabaseFollowStore } from '@/lib/followGoogleStore';

// "Followed from Google": the changes the 5-minute calendar job copied from
// Google Calendar by itself (src/lib/followGoogle.ts) in the last 7 days.
//   GET  — list them (first name + initial, no amounts)
//   POST — { id, action: 'undo' } puts one back in the app. Undo never writes
//          to Google, so Google keeps showing the change and the dashboard
//          lists it as a difference until it is fixed there.
// Admin session required.

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store, no-cache' };
const DAY = 86_400_000;

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const now = new Date();
  const rows = await supabaseFollowStore.listChanges(new Date(now.getTime() - UNDO_DAYS * DAY));
  if (!rows) return NextResponse.json({ items: [], available: false }, { headers: noCache });
  const ids = [...new Set(rows.map(r => r.client_id))];
  const { data: clients } = ids.length
    ? await supabaseAdmin.from('clients').select('id, full_name').in('id', ids)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((clients ?? []).map(c => [c.id as string, c.full_name as string]));
  const items = toFollowedItems(rows, id => promptLabel({ full_name: names.get(id) ?? '' }), now);
  return NextResponse.json({ items, available: true }, { headers: noCache });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  if (!id || body.action !== 'undo') return NextResponse.json({ error: 'id and action "undo" are required' }, { status: 400 });
  const { data: row } = await supabaseAdmin.from('calendar_followed_changes').select('client_id').eq('id', id).maybeSingle();
  const { data: client } = row?.client_id
    ? await supabaseAdmin.from('clients').select('full_name').eq('id', row.client_id).maybeSingle()
    : { data: null };
  const label = promptLabel({ full_name: (client?.full_name as string | undefined) ?? '' });
  const res = await undoFollowedChange(supabaseFollowStore, id, new Date(), () => label);
  console.log('[calendar/followed] undo', res.ok ? 'ok' : 'declined');
  return NextResponse.json(res, { status: res.ok ? 200 : 409, headers: noCache });
}
