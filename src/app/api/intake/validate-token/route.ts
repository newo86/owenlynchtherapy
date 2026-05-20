import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit, trackTokenFailure, isTokenBlocked } from '@/lib/rateLimit';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const TOKEN_FORMAT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]{32}$/;

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!rateLimit('validate-token', ip, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ valid: false, reason: 'Too many requests' }, { status: 429, headers: noCache });
  }

  if (isTokenBlocked(ip)) {
    console.warn('[validate-token] blocked IP after repeated failures:', ip);
    return NextResponse.json({ valid: false, reason: 'Too many failed attempts' }, { status: 429, headers: noCache });
  }

  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, reason: 'No token provided' }, { headers: noCache });
  }

  // Reject malformed tokens before hitting the DB
  if (!TOKEN_FORMAT_RE.test(token)) {
    console.warn('[validate-token] invalid token format from IP:', ip);
    trackTokenFailure(ip);
    return NextResponse.json({ valid: false, reason: 'Invalid token' }, { headers: noCache });
  }

  const { data, error } = await supabaseAdmin
    .from('intake_tokens')
    .select('client_name, client_email, expires_at, is_used')
    .eq('token', token)
    .single();

  if (error || !data) {
    console.warn('[validate-token] token not found, IP:', ip);
    trackTokenFailure(ip);
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
