import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('generate-token', ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: { client_email?: string; client_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_email, client_name } = body;
  if (!client_name?.trim()) {
    return NextResponse.json({ error: 'client_name is required' }, { status: 400 });
  }

  const token = `${randomUUID()}-${randomBytes(16).toString('hex')}`;
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { error } = await supabaseAdmin.from('intake_tokens').insert({
      token,
      client_name: client_name.trim(),
      ...(client_email?.trim() ? { client_email: client_email.trim() } : {}),
      expires_at,
    });

    if (error) {
      console.error('[generate-token] Supabase error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message ?? 'Failed to create token' }, { status: 500 });
    }
  } catch (err) {
    console.error('[generate-token] Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }

  const url = `https://owenlynchtherapy.com/intake?token=${token}`;
  return NextResponse.json(
    { url, token, expires_at },
    { headers: { 'Cache-Control': 'no-store, no-cache' } }
  );
}
