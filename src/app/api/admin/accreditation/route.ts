import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const KINDS = ['supervision', 'cpd', 'own_therapy'] as const;

// Accreditation log: supervision, CPD and personal-therapy hours (Hours page).
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { data, error } = await supabaseAdmin
    .from('accreditation_log')
    .select('id, kind, entry_date, hours, detail')
    .order('entry_date', { ascending: false });

  if (error) {
    console.error('[admin/accreditation] list failed:', error.message);
    return NextResponse.json({ error: 'Failed to load hours log' }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] }, { headers: noCache });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { kind?: string; entry_date?: string; hours?: number; detail?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const kind = KINDS.find(k => k === body.kind);
  const hours = Number(body.hours);
  const date = typeof body.entry_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.entry_date) ? body.entry_date : null;
  if (!kind || !date || !Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return NextResponse.json({ error: 'Choose a type, a date and between 0.25 and 24 hours.' }, { status: 400 });
  }
  const detail = typeof body.detail === 'string' ? body.detail.trim().slice(0, 200) || null : null;

  const { data, error } = await supabaseAdmin
    .from('accreditation_log')
    .insert({ kind, entry_date: date, hours, detail })
    .select('id, kind, entry_date, hours, detail')
    .single();
  if (error) {
    console.error('[admin/accreditation] insert failed:', error.message);
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ entry: data }, { headers: noCache });
}
