import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { google } from 'googleapis';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { inPersonAddressFor } from '@/lib/emailTemplates';
import { planIntervalChange } from '@/lib/sessionSeries';
import type { CalLike } from '@/lib/googleSessionEvents';
import { changeSeriesInterval, describeIntervalPlan, type IntervalDb, type SeriesSessionRow } from '@/lib/seriesInterval';

// Change how often an ongoing client comes (client record → "How often").
//
//   POST { series_id, interval_weeks }               → preview: the exact
//        change in words, nothing saved
//   POST { series_id, interval_weeks, confirm: true } → do it
//
// The app is the source here, so Google is updated to match
// (src/lib/seriesInterval.ts, changeSeriesInterval): the series row is
// claimed first (a short lock: a double tap, a second tab or the 5-minute job
// can't act at the same time; a refused claim → 409 and nothing done), the
// new repeat is started in Google, every database step runs in ONE
// transaction, and only then is the old repeat ended. If the database step
// fails, Google is put back. If Google isn't connected or refuses, nothing is
// changed in the app either (otherwise the 5-minute job would see Google's
// old rhythm and follow it straight back). Nothing emails the client.
// Admin session required.

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store, no-cache' };
const baseOf = (id: string) => id.split('_')[0];

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { series_id?: unknown; interval_weeks?: unknown; from_weeks?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const seriesId = typeof body.series_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.series_id) ? body.series_id : null;
  const weeks = Number(body.interval_weeks);
  if (!seriesId || !Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
    return NextResponse.json({ error: 'series_id and interval_weeks (1–4) are required' }, { status: 400 });
  }

  const { data: series } = await supabaseAdmin.from('session_series')
    .select('id, client_id, interval_weeks, gcal_event_id, anchor_at, active').eq('id', seriesId).maybeSingle();
  if (!series || !series.active || !series.gcal_event_id) {
    // (The preview never locks; the change itself claims the row first.)
    return NextResponse.json({ ok: false, message: 'This client has no ongoing series to change.' }, { status: 409, headers: noCache });
  }
  // The rhythm the page showed: if it has changed since, do nothing.
  if (body.from_weeks !== undefined && Number(body.from_weeks) !== series.interval_weeks) {
    return NextResponse.json({ ok: false, message: 'This changed meanwhile, so nothing was done. Close the record and open it again.' }, { status: 409, headers: noCache });
  }
  const now = new Date();
  const base = baseOf(series.gcal_event_id as string);
  const [{ data: mine, error: e1 }, { data: clientRows, error: e2 }, { data: client }] = await Promise.all([
    supabaseAdmin.from('sessions').select('id, session_date, status, gcal_event_id, session_format, location, fee, format_confirmed')
      .eq('client_id', series.client_id).like('gcal_event_id', `${base}%`)
      .eq('status', 'scheduled').gt('session_date', now.toISOString()).order('session_date').limit(500),
    supabaseAdmin.from('sessions').select('id, session_date')
      .eq('client_id', series.client_id).gte('session_date', new Date(now.getTime() - 4 * 86_400_000).toISOString()).limit(1000),
    supabaseAdmin.from('clients').select('full_name').eq('id', series.client_id).maybeSingle(),
  ]);
  if (e1 || e2 || !mine || !clientRows) {
    return NextResponse.json({ ok: false, message: "Couldn't read the sessions just now. Nothing was changed." }, { status: 503, headers: noCache });
  }
  const upcoming = (mine as SeriesSessionRow[])
    .filter(s => s.gcal_event_id && baseOf(s.gcal_event_id) === base);
  const plan = planIntervalChange(series, upcoming, clientRows, weeks, now);
  if ('error' in plan) return NextResponse.json({ ok: false, message: plan.error }, { status: 409, headers: noCache });

  const summary = describeIntervalPlan(plan, weeks);
  if (body.confirm !== true) {
    return NextResponse.json({ ok: true, preview: true, summary, cancels: plan.cancel.length, adds: plan.add.length }, { headers: noCache });
  }

  const auth = await getAuthorizedClient();
  const cal = auth ? (google.calendar({ version: 'v3', auth }) as unknown as CalLike) : null;
  const res = await changeSeriesInterval(cal, supabaseIntervalDb, {
    series: { id: series.id as string, interval_weeks: series.interval_weeks as number, gcal_event_id: series.gcal_event_id as string },
    plan, weeks,
    clientName: (client?.full_name as string | undefined) ?? 'Client',
    upcoming,
    now,
    addressFor: inPersonAddressFor,
  });
  console.log('[series/interval]', res.ok ? `changed to every ${weeks} week(s)` : `refused (${res.status})`);
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: res.status, headers: noCache });
  return NextResponse.json(res, { headers: noCache });
}

// The database side, on Supabase: the lock claim is a conditional update; the
// change itself is one transaction (apply_series_interval_change, migration
// session_series_change.sql).
const supabaseIntervalDb: IntervalDb = {
  async claim(seriesId, expect, until) {
    const nowIso = new Date().toISOString();
    const token = randomUUID();
    const { data, error } = await supabaseAdmin.from('session_series')
      .update({ change_lock_until: until.toISOString(), change_lock_token: token })
      .eq('id', seriesId).eq('active', true)
      .eq('interval_weeks', expect.interval_weeks).eq('gcal_event_id', expect.gcal_event_id)
      .or(`change_lock_until.is.null,change_lock_until.lt.${nowIso}`)
      .select('id');
    if (error) {
      console.error('[series/interval] claim failed (migration session_series_change.sql applied?):', dbError(error).message);
      return { status: 'unavailable' };
    }
    return data?.length ? { status: 'ok', token } : { status: 'conflict' };
  },
  async release(seriesId, token) {
    await supabaseAdmin.from('session_series').update({ change_lock_until: null, change_lock_token: null })
      .eq('id', seriesId).eq('change_lock_token', token);
  },
  async runChange(p) {
    const { data, error } = await supabaseAdmin.rpc('apply_series_interval_change', {
      p_series_id: p.seriesId, p_lock_token: p.token,
      p_expect_interval: p.expect.interval_weeks, p_expect_gcal: p.expect.gcal_event_id,
      p_interval: p.interval, p_anchor: p.anchor, p_new_gcal: p.newGcal,
      p_cancel: p.cancel, p_relink: p.relink, p_adds: p.adds,
    });
    if (error) { console.error('[series/interval] change not saved:', dbError(error).message); return { ok: false }; }
    return { ok: true, added: Number((data as { added?: number } | null)?.added ?? 0) };
  },
  async readSeries(seriesId) {
    const { data, error } = await supabaseAdmin.from('session_series')
      .select('interval_weeks, gcal_event_id, anchor_at').eq('id', seriesId).maybeSingle();
    if (error || !data) return null;
    return data as { interval_weeks: number; gcal_event_id: string | null; anchor_at: string };
  },
  async setSessionEvent(sessionId, gcal) {
    await supabaseAdmin.from('sessions').update({ gcal_event_id: gcal }).eq('id', sessionId).eq('status', 'scheduled');
  },
};
