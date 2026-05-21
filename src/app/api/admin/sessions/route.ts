import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = req.nextUrl.searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('[sessions GET] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to fetch sessions' }, { status: 500 });
  }

  return NextResponse.json({ sessions: data }, { headers: noCache });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    client_id: string;
    session_date: string;
    session_format: string;
    fee: number;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_id, session_date, session_format, fee, notes } = body;
  if (!client_id || !session_date || !session_format || !fee) {
    return NextResponse.json({ error: 'client_id, session_date, session_format, and fee are required' }, { status: 400 });
  }

  const VALID_FORMATS = ['in_person', 'online'];
  if (!VALID_FORMATS.includes(session_format)) {
    return NextResponse.json({ error: 'Invalid session_format' }, { status: 400 });
  }

  const location = session_format === 'in_person'
    ? 'Insight Matters, 106 Capel Street, Dublin, D01 WY40'
    : "I'll send you a link to join shortly before your session.";

  const { data, error } = await supabaseAdmin.from('sessions').insert({
    client_id,
    session_date,
    session_format,
    location,
    fee: Math.round(fee),
    status: 'scheduled',
    payment_status: 'unpaid',
    notes: notes ?? null,
  }).select().single();

  if (error) {
    console.error('[sessions POST] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to create session' }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { headers: noCache });
}
