import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// Waitlist actions: mark contacted / back to waiting, or delete (GDPR
// erasure — a hard delete, nothing is kept).
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { id?: string; action?: 'contacted' | 'waiting' | 'delete' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id || !body.action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
  }

  if (body.action === 'delete') {
    const { error } = await supabaseAdmin.from('waitlist').delete().eq('id', body.id);
    if (error) {
      console.error('[admin/waitlist] delete failed:', error.message);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true }, { headers: noCache });
  }

  const patch = body.action === 'contacted'
    ? { status: 'contacted', contacted_at: new Date().toISOString() }
    : { status: 'waiting', contacted_at: null };

  const { error } = await supabaseAdmin.from('waitlist').update(patch).eq('id', body.id);
  if (error) {
    console.error('[admin/waitlist] update failed:', error.message);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
