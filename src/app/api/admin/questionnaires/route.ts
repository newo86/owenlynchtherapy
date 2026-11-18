import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { TEST_CLIENT_ID } from '@/lib/questionnaires/tokens';

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
      .select('id, client_id, is_test, kind, answers, scores, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(1000),
    supabaseAdmin
      .from('questionnaire_tokens')
      .select('id, client_id, is_test, kind, created_at, expires_at, used_at, emailed_at')
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

  // Test rows have no client; give them a stable id the dashboard can group on.
  const withTest = <T extends { client_id: string | null; is_test?: boolean }>(rows: T[]) =>
    rows.map(r => (r.is_test ? { ...r, client_id: TEST_CLIENT_ID } : r));

  return NextResponse.json(
    { responses: withTest(respRes.data ?? []), pending: withTest(tokRes.data ?? []) },
    { headers: noCache },
  );
}

/**
 * DELETE /api/admin/questionnaires   — clears every TEST link and result
 * (the practitioner's own tries). Never touches a client's rows.
 */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  // Responses cascade from their token, but delete both explicitly.
  const r1 = await supabaseAdmin.from('questionnaire_responses').delete().eq('is_test', true).is('client_id', null);
  const r2 = await supabaseAdmin.from('questionnaire_tokens').delete().eq('is_test', true).is('client_id', null);
  if (r1.error || r2.error) {
    console.error('[questionnaires] clear tests error:', dbError(r1.error ?? r2.error));
    return NextResponse.json({ error: 'Could not clear test results' }, { status: 500, headers: noCache });
  }
  return NextResponse.json({ success: true }, { headers: noCache });
}
