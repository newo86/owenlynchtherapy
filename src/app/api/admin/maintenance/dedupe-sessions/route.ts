import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/adminAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// One-time cleanup for duplicate session rows created before the calendar sync
// was guarded against recurring-instance re-imports. Groups non-cancelled
// sessions by client_id + exact session_date and removes all but one per group,
// preferring to KEEP the row that:
//   1. is already paid (never delete a payment record), else
//   2. has a gcal_event_id (the properly-linked one), else
//   3. was created earliest.
//
// dryRun by default — pass ?apply=true to actually delete.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const apply = req.nextUrl.searchParams.get('apply') === 'true';

  const { data: rows, error } = await supabaseAdmin
    .from('sessions')
    .select('id, client_id, session_date, payment_status, status, paid_at, stripe_payment_intent_id, gcal_event_id, created_at')
    .neq('status', 'cancelled');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const groups = new Map<string, typeof rows>();
  for (const s of rows ?? []) {
    const key = `${s.client_id}@${s.session_date}`;
    const g = groups.get(key);
    if (g) g.push(s); else groups.set(key, [s]);
  }

  // Score a row so the KEPT copy is always the most valuable — never delete a
  // payment. Matches the dashboard's display dedupe (components/admin/api.ts).
  type Row = NonNullable<typeof rows>[number];
  const score = (s: Row): number => {
    let n = 0;
    if (s.payment_status === 'paid') n += 8;
    if (s.status === 'attended') n += 4;
    if (s.paid_at || s.stripe_payment_intent_id) n += 2;
    if (s.gcal_event_id) n += 1;
    return n;
  };

  const toDelete: string[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const d = score(b) - score(a);
      if (d !== 0) return d;
      // tie-break: keep the earliest-created row.
      return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
    });
    // Keep sorted[0] (highest score); delete the rest.
    for (const dup of sorted.slice(1)) toDelete.push(dup.id as string);
  }

  if (!apply) {
    return NextResponse.json(
      { dryRun: true, duplicateGroups: [...groups.values()].filter(g => g.length > 1).length, wouldDelete: toDelete.length },
      { headers: noCache },
    );
  }

  let deleted = 0;
  if (toDelete.length > 0) {
    const { error: delErr, count } = await supabaseAdmin
      .from('sessions')
      .delete({ count: 'exact' })
      .in('id', toDelete);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    deleted = count ?? toDelete.length;
  }

  console.log('[dedupe-sessions] removed', deleted, 'duplicate session row(s)');
  return NextResponse.json({ dryRun: false, deleted }, { headers: noCache });
}
