import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  mergeSettings,
  PRACTICE_DEFAULTS,
  type PracticeSettings,
} from '@/lib/practiceSettings';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// Practice settings (dashboard Settings page). GET returns the current
// merged settings; POST saves the full document and revalidates every
// cached page that reads it.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { data, error } = await supabaseAdmin
      .from('practice_settings')
      .select('data, updated_at')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      {
        settings: mergeSettings(data?.data as Partial<PracticeSettings> | undefined),
        saved: Boolean(data),
        updated_at: data?.updated_at ?? null,
      },
      { headers: noCache },
    );
  } catch (err) {
    // Table missing (migration not run) — still show the form with defaults.
    console.warn('[settings] read failed:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { settings: PRACTICE_DEFAULTS, saved: false, updated_at: null, storage_unavailable: true },
      { headers: noCache },
    );
  }
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && isFinite(v);

/** Light validation: right shapes, sane lengths, sensible numbers. The form
 *  is admin-only, so this guards against mistakes, not attackers. */
function validate(s: PracticeSettings): string | null {
  if (!isStr(s.businessName) || !s.businessName.trim()) return 'Business name is required.';
  if (!isStr(s.practitionerName) || !s.practitionerName.trim()) return 'Practitioner name is required.';
  if (!isStr(s.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return 'Contact email looks invalid.';
  for (const k of ['onlineCents', 'inPersonCents', 'lowCostCents', 'roomCostCents'] as const) {
    if (!isNum(s.fees?.[k]) || s.fees[k] < 0 || s.fees[k] > 100_000) {
      return 'Fees must be between €0 and €1,000.';
    }
  }
  if (!isNum(s.sessionMinutes) || s.sessionMinutes < 10 || s.sessionMinutes > 240) {
    return 'Session length must be 10–240 minutes.';
  }
  const acc = s.accreditation;
  if (!isNum(acc?.hoursTarget) || acc.hoursTarget < 0 || acc.hoursTarget > 100_000
    || !isNum(acc?.hoursBaseline) || acc.hoursBaseline < 0 || acc.hoursBaseline > 100_000) {
    return 'Accreditation hours target/baseline must be sensible numbers.';
  }
  if (!isStr(acc?.hoursCountFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(acc.hoursCountFrom)) {
    return 'Accreditation "count from" must be a date (YYYY-MM-DD).';
  }
  if (!Array.isArray(s.openingHours) || s.openingHours.some(h =>
    !isStr(h?.dayOfWeek) || !/^\d{2}:\d{2}$/.test(h?.opens ?? '') || !/^\d{2}:\d{2}$/.test(h?.closes ?? ''))) {
    return 'Opening hours rows need a day and HH:MM times.';
  }
  if (!Array.isArray(s.availability) || s.availability.length > 20 || s.availability.some(a =>
    !isStr(a?.day) || !a.day.trim() || !isStr(a?.time) || !a.time.trim()
    || (a.format !== 'in_person' && a.format !== 'online'))) {
    return 'Each available slot needs a day, a time, and a format.';
  }
  for (const url of [s.telehealthUrl, s.stripeLinks?.online, s.stripeLinks?.inPerson]) {
    if (url && !/^https:\/\//.test(url)) return 'Links must start with https://';
  }
  const asJson = JSON.stringify(s);
  if (asJson.length > 50_000) return 'Settings document is unexpectedly large.';
  return null;
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { settings?: Partial<PracticeSettings> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Merge over defaults so a partial submit can never blank required fields.
  const merged = mergeSettings(body.settings);
  const problem = validate(merged);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('practice_settings')
    .upsert({ id: 1, data: merged, updated_at: new Date().toISOString() });

  if (error) {
    console.error('[settings] save failed:', error.message);
    const hint = /relation .*practice_settings/.test(error.message)
      ? 'The practice_settings table is missing — run supabase/migrations/practice_settings.sql.'
      : 'Could not save settings.';
    return NextResponse.json({ error: hint }, { status: 500 });
  }

  // Bust every cached page/JSON-LD/footer that reads getPractice().
  // { expire: 0 } = expire now, so the next page view renders the new values
  // (the default 'max' profile would serve one more stale view first).
  revalidateTag('practice', { expire: 0 });

  return NextResponse.json({ success: true }, { headers: noCache });
}
