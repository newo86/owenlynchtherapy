import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Full-practice backup: every business table as one JSON download, so the
// practitioner can keep an offline copy of their client data (and a future
// restore has everything it needs).
//
// Deliberately NOT included: google_oauth_tokens and admin_mfa (secrets that
// must never leave the server) and rate_limits (operational noise).
const TABLES = [
  'clients',
  'sessions',
  'payments',
  'intake_submissions',
  'intake_tokens',
  'session_reminders',
  'reminder_runs',
  'waitlist',
  'practice_settings',
] as const;

async function fetchAll(table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return rows;
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const tables: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};

  // Per-table isolation: one missing table (migration not run yet) must not
  // sink the rest of the backup.
  for (const table of TABLES) {
    try {
      tables[table] = await fetchAll(table);
    } catch (err) {
      errors[table] = err instanceof Error ? err.message : String(err);
    }
  }

  if (Object.keys(tables).length === 0) {
    return NextResponse.json(
      { error: 'Backup failed — could not read any table.', errors },
      { status: 500 },
    );
  }

  const stamp = new Date().toISOString();
  const body = JSON.stringify(
    { exported_at: stamp, source: 'admin backup', tables, ...(Object.keys(errors).length ? { errors } : {}) },
    null,
    2,
  );

  console.log(`[backup] exported ${Object.keys(tables).length} tables`);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="practice-backup-${stamp.slice(0, 10)}.json"`,
      'Cache-Control': 'no-store, no-cache',
    },
  });
}
