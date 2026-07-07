import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from('intake_submissions')
    .select('id, client_id, full_name, email, session_format, submitted_at, date_of_birth, phone, emergency_contact_name, emergency_contact_phone, gp_name')
    .order('submitted_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[submissions list]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { submissions: data },
    { headers: { 'Cache-Control': 'no-store, no-cache' } },
  );
}
