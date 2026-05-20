import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('intake_tokens')
    .select('id, token, client_name, client_email, created_at, expires_at, is_used')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[tokens list] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to fetch tokens' }, { status: 500 });
  }

  return NextResponse.json(
    { tokens: data },
    { headers: { 'Cache-Control': 'no-store, no-cache' } }
  );
}
