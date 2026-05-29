import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*, sessions(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[clients] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to fetch clients' }, { status: 500 });
  }

  return NextResponse.json({ clients: data }, { headers: noCache });
}
