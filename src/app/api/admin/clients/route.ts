import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  // session_reminders is nested so the UI can show "Reminder sent 07:01"
  // on session rows without a second request.
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('*, sessions(*, session_reminders(sent_at, reminder_type))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[clients] Supabase error:', dbError(error));
    return NextResponse.json({ error: error.message ?? 'Failed to fetch clients' }, { status: 500 });
  }

  // How each paid session was paid (Revolut, cash, card), from the payments
  // ledger. Best-effort: if the paid_via column isn't there yet (migration not
  // applied) or the read fails, sessions simply carry no paid_via and Money
  // falls back to its old derivation.
  const viaBySession = new Map<string, string>();
  try {
    const { data: ledger, error: ledgerErr } = await supabaseAdmin
      .from('payments')
      .select('session_id, paid_via')
      .not('paid_via', 'is', null)
      .limit(10000);
    if (!ledgerErr) {
      for (const row of ledger ?? []) {
        if (row.session_id && row.paid_via) viaBySession.set(row.session_id as string, row.paid_via as string);
      }
    }
  } catch { /* shown without it */ }
  const clients = viaBySession.size === 0 ? data : (data ?? []).map(c => ({
    ...c,
    sessions: ((c.sessions as Array<{ id: string }> | null) ?? []).map(s => (
      viaBySession.has(s.id) ? { ...s, paid_via: viaBySession.get(s.id) } : s
    )),
  }));

  return NextResponse.json({ clients }, { headers: noCache });
}
