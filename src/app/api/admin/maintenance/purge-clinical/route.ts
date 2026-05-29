import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// Clinical-record retention: keep clients, sessions and intake submissions for
// 7 years after last contact, then delete (unless the client requested earlier
// erasure — handled separately via /api/admin/clients/delete). "Last contact"
// is the most recent session; a client with no session in the window and
// created over 7 years ago is also out of retention.
const RETENTION_YEARS = 7;

// SAFETY: deletion only happens when CLINICAL_PURGE_ENABLED === 'true'. Until
// then this runs as a dry-run that only reports how many records WOULD be
// purged. Auto-deleting clinical data is irreversible, so it requires a
// deliberate opt-in. (There is also nothing old enough to delete until 2033, so
// the dry-run is the safe default for years.)
//
// Runs monthly via Vercel cron; also callable manually with the admin session.
export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || requireAdmin(req) === null;
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  const cutoffIso = cutoff.toISOString();

  // Clients with a session on/after the cutoff are still in retention — keep all
  // their records.
  const { data: recent, error: recentErr } = await supabaseAdmin
    .from('sessions')
    .select('client_id')
    .gte('session_date', cutoffIso);
  if (recentErr) {
    console.error('[purge-clinical] recent-sessions query error:', recentErr.message);
    return NextResponse.json({ error: recentErr.message }, { status: 500 });
  }
  const activeIds = new Set(
    (recent ?? []).map(r => (r as { client_id: string | null }).client_id).filter(Boolean),
  );

  // Candidates: clients created before the cutoff with no recent session.
  const { data: oldClients, error: clientsErr } = await supabaseAdmin
    .from('clients')
    .select('id, created_at')
    .lt('created_at', cutoffIso);
  if (clientsErr) {
    console.error('[purge-clinical] old-clients query error:', clientsErr.message);
    return NextResponse.json({ error: clientsErr.message }, { status: 500 });
  }
  const purgeIds = (oldClients ?? [])
    .map(c => (c as { id: string }).id)
    .filter(id => !activeIds.has(id));

  const enabled = process.env.CLINICAL_PURGE_ENABLED === 'true';

  if (!enabled || purgeIds.length === 0) {
    console.log('[purge-clinical]', enabled ? 'no records past retention' : 'dry-run', '· candidates:', purgeIds.length);
    return NextResponse.json(
      { ok: true, dryRun: !enabled, retentionYears: RETENTION_YEARS, candidates: purgeIds.length, purged: 0 },
      { headers: noCache },
    );
  }

  // Delete child rows first to satisfy FK constraints, mirroring clients/delete.
  let purged = 0;
  for (const id of purgeIds) {
    await supabaseAdmin.from('sessions').delete().eq('client_id', id);
    await supabaseAdmin.from('intake_submissions').delete().eq('client_id', id);
    await supabaseAdmin.from('intake_tokens').delete().eq('client_id', id);
    const del = await supabaseAdmin.from('clients').delete().eq('id', id);
    if (!del.error) purged++;
    else console.error('[purge-clinical] client delete error:', del.error.message);
  }

  console.log('[purge-clinical] purged', purged, 'client record(s) past', RETENTION_YEARS, 'year retention');
  return NextResponse.json(
    { ok: true, dryRun: false, retentionYears: RETENTION_YEARS, candidates: purgeIds.length, purged },
    { headers: noCache },
  );
}
