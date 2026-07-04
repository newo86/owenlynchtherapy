import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

// Reminder health for the dashboard strip: the latest reminder_runs row plus
// whether the email kill switch is on. Read-only.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from('reminder_runs')
    .select('ran_at, outcome, candidates, sent, skipped, failed, detail')
    .order('ran_at', { ascending: false })
    .limit(1);

  return NextResponse.json({
    // null when the table is empty or missing (migration not yet applied) —
    // the UI treats that as "no run recorded".
    lastRun: error ? null : data?.[0] ?? null,
    emailsEnabled: process.env.EMAILS_ENABLED === 'true',
  });
}
