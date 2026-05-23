import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// POST /api/admin/clients/delete  body: { client_id: string }
//
// We use POST instead of HTTP DELETE so the route shape stays straightforward
// (no [id] route segment needed) and so the admin can send a JSON body with
// the Authorization header in exactly the same shape as every other admin
// mutation in this codebase. Deletion is permanent and cascades manually
// through sessions, intake submissions, and intake tokens — the existing
// schema doesn't have ON DELETE CASCADE.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { client_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { client_id } = body;
  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  console.log('[clients/delete] cascading delete for client:', client_id);

  // 1. Child rows first to satisfy FK constraints.
  const sessionsDel = await supabaseAdmin.from('sessions').delete().eq('client_id', client_id);
  if (sessionsDel.error) {
    console.error('[clients/delete] sessions error:', sessionsDel.error);
    return NextResponse.json({ error: sessionsDel.error.message }, { status: 500 });
  }

  const submissionsDel = await supabaseAdmin.from('intake_submissions').delete().eq('client_id', client_id);
  if (submissionsDel.error) {
    console.error('[clients/delete] submissions error:', submissionsDel.error);
    // Fall through — the column may not exist on a legacy submission, in which
    // case we leave the orphan row rather than failing the whole delete.
  }

  const tokensDel = await supabaseAdmin.from('intake_tokens').delete().eq('client_id', client_id);
  if (tokensDel.error) {
    console.error('[clients/delete] tokens error:', tokensDel.error);
  }

  // 2. The client itself.
  const { error } = await supabaseAdmin.from('clients').delete().eq('id', client_id);
  if (error) {
    console.error('[clients/delete] client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
