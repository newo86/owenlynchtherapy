import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/**
 * GET /api/admin/questionnaires
 * Every questionnaire response, plus the links still waiting to be completed.
 * The raw token is never returned (a link can't be re-shared from here).
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const [respRes, tokRes] = await Promise.all([
    supabaseAdmin
      .from('questionnaire_responses')
      .select('id, client_id, kind, answers, scores, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from('questionnaire_tokens')
      .select('id, client_id, kind, created_at, expires_at, used_at, emailed_at')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (respRes.error || tokRes.error) {
    console.error('[questionnaires] load error:', dbError(respRes.error ?? tokRes.error));
    return NextResponse.json(
      { error: 'Could not load questionnaires', migration_missing: (respRes.error ?? tokRes.error)?.code === '42P01' },
      { status: 500, headers: noCache },
    );
  }

  return NextResponse.json({ responses: respRes.data, pending: tokRes.data }, { headers: noCache });
}
