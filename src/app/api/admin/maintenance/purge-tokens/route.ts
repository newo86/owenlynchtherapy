import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { bearerMatches } from '@/lib/adminAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// GDPR data minimisation (Art 5(1)(c)/(e)): an intake link that was generated
// but never used still holds the prospective client's name and email. Once the
// link has expired — plus a 30-day grace window — it serves no purpose, so we
// delete it. Only UNUSED tokens are purged; a used token backs a real intake
// submission and clinical record, which are retained per the practice's
// documented retention policy (see docs/DATA-RETENTION.md).
//
// Runs daily via Vercel cron (see vercel.json); also callable manually with the
// admin secret. Auth matches the weekly-report route: CRON_SECRET or the admin
// secret, both compared in constant time.
export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET)
    || bearerMatches(req, process.env.INTAKE_ADMIN_SECRET);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('intake_tokens')
    .delete()
    .eq('is_used', false)
    .lt('expires_at', cutoff)
    .select('id');

  if (error) {
    console.error('[purge-tokens] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const purged = data?.length ?? 0;
  console.log('[purge-tokens] purged', purged, 'expired unused intake token(s)');
  return NextResponse.json({ ok: true, purged }, { headers: noCache });
}
