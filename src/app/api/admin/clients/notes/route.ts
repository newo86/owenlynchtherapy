import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { client_id?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_id, notes } = body;
  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ notes: notes ?? '' })
    .eq('id', client_id);

  if (error) {
    console.error('[clients/notes] update error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to update notes' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
