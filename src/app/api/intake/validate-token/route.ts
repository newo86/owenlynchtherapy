import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'No token provided' }, { headers: noCache });
  }

  const { data, error } = await supabaseAdmin
    .from('intake_tokens')
    .select('client_name, client_email, expires_at, is_used')
    .eq('token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ valid: false, reason: 'Token not found' }, { headers: noCache });
  }

  if (data.is_used) {
    return NextResponse.json({ valid: false, reason: 'Token already used' }, { headers: noCache });
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'Token expired' }, { headers: noCache });
  }

  return NextResponse.json(
    { valid: true, client_name: data.client_name, client_email: data.client_email },
    { headers: noCache }
  );
}
