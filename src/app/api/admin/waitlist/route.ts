import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from('waitlist')
    .select('id, full_name, email, phone, status, created_at, contacted_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin/waitlist] error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
  }

  return NextResponse.json({ waitlist: data ?? [] }, { headers: noCache });
}
