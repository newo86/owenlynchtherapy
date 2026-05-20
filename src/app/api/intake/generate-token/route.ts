import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { client_email?: string; client_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_email, client_name } = body;
  if (!client_email?.trim() || !client_name?.trim()) {
    return NextResponse.json(
      { error: 'client_email and client_name are required' },
      { status: 400 }
    );
  }

  const token = `${randomUUID()}-${randomBytes(16).toString('hex')}`;
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin.from('intake_tokens').insert({
    token,
    client_email: client_email.trim(),
    client_name: client_name.trim(),
    expires_at,
  });

  if (error) {
    console.error('[generate-token]', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }

  const url = `https://owenlynchtherapy.com/intake?token=${token}`;
  return NextResponse.json(
    { url, token, expires_at },
    { headers: { 'Cache-Control': 'no-store, no-cache' } }
  );
}
