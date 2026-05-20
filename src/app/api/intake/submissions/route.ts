import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('intake_submissions')
    .select('id, full_name, email, session_format, submitted_at')
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
