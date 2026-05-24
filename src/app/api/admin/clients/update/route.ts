import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// Partial update of a client row. Accepts client_id + any subset of the
// admin-editable fields. We whitelist the columns so a malicious body
// can't touch status / email / id directly.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    client_id?: string;
    is_low_cost?: boolean;
    session_fee?: number;  // euros
    notes?: string;
    status?: 'active' | 'new' | 'completed';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.is_low_cost === 'boolean') patch.is_low_cost = body.is_low_cost;
  if (typeof body.session_fee === 'number' && body.session_fee > 0) {
    patch.session_fee = Math.round(body.session_fee * 100);
  }
  if (typeof body.notes === 'string') patch.notes = body.notes;
  if (body.status && ['active', 'new', 'completed'].includes(body.status)) patch.status = body.status;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No updatable fields in body' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update(patch)
    .eq('id', body.client_id);

  if (error) {
    console.error('[clients/update] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
